import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, rosterInstances, teams, users } from "@/db/schema";
import { BattingStatCells } from "@/components/BattingStatCells";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { aggregateBattingByCharId } from "@/lib/game-stats-queries";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { characterMugshotUrl, stadiumIconUrl } from "@/lib/asset-urls";
import { updateTeamAction } from "@/server/actions";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string; teamId: string }>;
  searchParams: Promise<{ e?: string; m?: string }>;
};

export default async function TeamPage({ params, searchParams }: Props) {
  const { leagueId, seasonId, teamId } = await params;
  const { e, m } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team || team.seasonId !== seasonId) notFound();

  const [manager] = team.managerUserId
    ? await db.select().from(users).where(eq(users.id, team.managerUserId)).limit(1)
    : [null];

  const roster = await db
    .select({ instance: rosterInstances, character: characters })
    .from(rosterInstances)
    .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
    .where(
      and(eq(rosterInstances.seasonId, seasonId), eq(rosterInstances.teamId, teamId)),
    );

  const battingByChar = await aggregateBattingByCharId({ seasonId, teamId });

  const stadiumRow = team.homeStadiumGameId
    ? dash.stadiums.find((s) => s.gameStadiumId === team.homeStadiumGameId)
    : null;
  const stadiumImg = stadiumRow?.iconFile
    ? stadiumIconUrl(stadiumRow.iconFile)
    : null;

  const isAdmin = role === "admin";
  const isManager = team.managerUserId === user.id;
  const canEdit = isAdmin || isManager;

  const teamGames = dash.games
    .filter(
      (g) => g.game.homeTeamId === teamId || g.game.awayTeamId === teamId,
    )
    .map(({ game, round }) => {
      const isHome = game.homeTeamId === teamId;
      const oppId = isHome ? game.awayTeamId : game.homeTeamId;
      const opp = dash.teams.find((t) => t.team.id === oppId);
      const played = game.playedAt != null && game.homeScore != null && game.awayScore != null;
      let result: "W" | "L" | null = null;
      if (played) {
        const ours = isHome ? game.homeScore! : game.awayScore!;
        const theirs = isHome ? game.awayScore! : game.homeScore!;
        result = ours > theirs ? "W" : "L";
      }
      return { game, round, isHome, opp, played, result };
    });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/leagues/${leagueId}/seasons/${seasonId}`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Season
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{team.name}</h1>
      {e ? (
        <p className="mt-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "updated" ? (
        <p className="mt-2 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Team updated.
        </p>
      ) : null}
      {manager ? (
        <p className="mt-1 text-zinc-400">
          Manager: <span className="text-zinc-200">{manager.username}</span>
          {manager.displayName ? (
            <span className="text-zinc-500"> ({manager.displayName})</span>
          ) : null}
        </p>
      ) : (
        <p className="mt-1 text-zinc-500">No manager assigned.</p>
      )}

      {team.homeStadiumGameId ? (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Home stadium
          </h2>
          <div className="mt-2 flex items-center gap-3">
            {stadiumImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stadiumImg} alt="" width={48} height={48} className="rounded" />
            ) : null}
            <span className="text-lg">{team.homeStadiumGameId}</span>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Roster & season stats</h2>
        <p className="text-sm text-zinc-500">
          Batting totals from uploaded game stats this season.
        </p>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-2 pr-2">Character</th>
              <th className="py-2 pr-2">AB</th>
              <th className="py-2 pr-2">H</th>
              <th className="py-2 pr-2">HR</th>
              <th className="py-2 pr-2">RBI</th>
              <th className="py-2 pr-2">AVG</th>
              <th className="py-2 pr-2">OBP</th>
              <th className="py-2 pr-2">SLG</th>
            </tr>
          </thead>
          <tbody>
            {roster.map(({ character, instance }) => {
              const line = battingByChar.get(character.gameCharId);
              return (
                <tr key={instance.id} className="border-b border-zinc-900">
                  <td className="py-2 pr-2">
                    <Link
                      href={`/leagues/${leagueId}/characters/${encodeURIComponent(character.gameCharId)}?season=${seasonId}`}
                      className="flex items-center gap-2 hover:text-amber-400"
                    >
                      {character.mugshotFile ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={characterMugshotUrl(character.mugshotFile)}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded"
                        />
                      ) : (
                        <CharacterMugshot charId={character.gameCharId} />
                      )}
                      {character.displayName}
                    </Link>
                  </td>
                  {line ? (
                    <BattingStatCells
                      ab={line.ab}
                      hits={line.hits}
                      hr={line.hr}
                      rbi={line.rbi}
                      walks4ball={line.walks4ball}
                      walksHbp={line.walksHbp}
                      sacFly={line.sacFly}
                      singles={line.singles}
                      doubles={line.doubles}
                      triples={line.triples}
                      showObpSlg
                    />
                  ) : (
                    <>
                      <td className="py-2 pr-2 text-zinc-600">0</td>
                      <td className="py-2 pr-2 text-zinc-600">0</td>
                      <td className="py-2 pr-2 text-zinc-600">0</td>
                      <td className="py-2 pr-2 text-zinc-600">0</td>
                      <td className="py-2 pr-2 text-zinc-600">—</td>
                      <td className="py-2 pr-2 text-zinc-600">—</td>
                      <td className="py-2 pr-2 text-zinc-600">—</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {roster.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No players assigned yet.</p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Schedule</h2>
        <ul className="mt-3 space-y-2">
          {teamGames.map(({ game, round, isHome, opp, played, result }) => (
            <li
              key={game.id}
              className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-500">
                  {round.phase === "playoffs" ? "PO" : "R"}
                  {round.roundNumber} ·{" "}
                  {isHome ? "vs" : "@"}{" "}
                </span>
                <span className="font-medium">{opp?.team.name ?? "?"}</span>
                {played ? (
                  <>
                    <span className="text-zinc-400">
                      {isHome ? game.homeScore : game.awayScore}–
                      {isHome ? game.awayScore : game.homeScore}
                    </span>
                    <span
                      className={
                        result === "W" ? "text-green-400" : "text-red-400"
                      }
                    >
                      {result}
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-500">Scheduled</span>
                )}
                {game.statsRawJson ? (
                  <Link
                    href={`/leagues/${leagueId}/seasons/${seasonId}/games/${game.id}`}
                    className="text-amber-400 hover:underline"
                  >
                    Box score
                  </Link>
                ) : null}
              </div>
              {game.statsStadiumId ? (
                <p className="mt-1 text-xs text-zinc-600">{game.statsStadiumId}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {canEdit ? (
        <section className="mt-10 rounded-lg border border-amber-900/40 bg-amber-950/10 p-4">
          <h2 className="font-semibold text-amber-200">
            Rename &amp; edit team {isAdmin ? "(admin)" : "(manager)"}
          </h2>
          <form
            action={updateTeamAction.bind(null, teamId, seasonId, leagueId)}
            className="mt-3 space-y-3"
          >
            <div>
              <label className="text-xs text-zinc-500">Team name</label>
              <input
                name="name"
                defaultValue={team.name}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
            </div>
            {isAdmin ? (
              <div>
                <label className="text-xs text-zinc-500">Manager username</label>
                <input
                  name="managerUsername"
                  defaultValue={manager?.username ?? ""}
                  placeholder="empty = none"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
              </div>
            ) : null}
            <div>
              <label className="text-xs text-zinc-500">Home stadium (game ID)</label>
              <input
                name="homeStadium"
                defaultValue={team.homeStadiumGameId ?? ""}
                placeholder="e.g. Bowser Castle"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
            </div>
            <button
              type="submit"
              className="msb-btn-primary px-3 py-1 text-sm"
            >
              Save
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
