import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, rosterInstances, teams, users } from "@/db/schema";
import { BattingStatCells } from "@/components/BattingStatCells";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import { ManagerAvatar } from "@/components/ManagerAvatar";
import { StadiumSelect } from "@/components/StadiumSelect";
import { getCurrentUser } from "@/lib/auth";
import { managerDisplayName } from "@/lib/manager-profile";
import { getLeagueRole } from "@/lib/league-access";
import {
  aggregateBattingByCharOccurrence,
  battingStatKey,
} from "@/lib/game-stats-queries";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { characterMugshotUrl, stadiumIconUrl } from "@/lib/asset-urls";
import { scheduleRoundShortLabel } from "@/lib/schedule-labels";
import { updateTeamAction, updateProfileAction } from "@/server/actions";
import { PageShell } from "@/components/PageShell";

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
    )
    .orderBy(asc(characters.displayName), asc(rosterInstances.copyIndex));

  const battingByOccurrence = await aggregateBattingByCharOccurrence({ seasonId, teamId });

  const rosterCopyCounts = new Map<string, number>();
  for (const { character } of roster) {
    rosterCopyCounts.set(
      character.gameCharId,
      (rosterCopyCounts.get(character.gameCharId) ?? 0) + 1,
    );
  }

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
    <PageShell width="wide">
      <Link
        href={`/leagues/${leagueId}/seasons/${seasonId}`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Season
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{team.name}</h1>
      {m === "claimed" ? (
        <p className="mt-2 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Team claimed — you&apos;re the manager now.
        </p>
      ) : null}
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
      {m === "profile-updated" ? (
        <p className="mt-2 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Profile picture updated.
        </p>
      ) : null}
      {manager ? (
        <div className="mt-3 flex items-center gap-3">
          <ManagerAvatar user={manager} size={56} />
          <div>
            <p className="text-zinc-400">
              Manager:{" "}
              <span className="text-zinc-200">{managerDisplayName(manager)}</span>
            </p>
            <p className="text-sm text-zinc-500">@{manager.username}</p>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-zinc-500">
          No manager assigned.
          {team.claimUsername ? (
            <span> Reserved for {team.claimUsername}.</span>
          ) : null}
        </p>
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

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start">
      <section>
        <h2 className="text-lg font-semibold">Roster & season stats</h2>
        <p className="text-sm text-zinc-500">
          Batting totals from uploaded game stats this season.
        </p>
        <div className="msb-table-wrap mt-3">
        <table className="w-full text-left text-sm">
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
              const occurrenceIndex = instance.copyIndex - 1;
              const line = battingByOccurrence.get(
                battingStatKey(character.gameCharId, occurrenceIndex),
              );
              const showCopy =
                (rosterCopyCounts.get(character.gameCharId) ?? 0) > 1;
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
                      {showCopy ? (
                        <span className="text-zinc-500">#{instance.copyIndex}</span>
                      ) : null}
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
        </div>
        {roster.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No players assigned yet.</p>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Schedule</h2>
        <ul className="mt-3 space-y-2">
          {teamGames.map(({ game, round, isHome, opp, played, result }) => (
            <li
              key={game.id}
              className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-500">
                  {scheduleRoundShortLabel(round.phase, round.roundNumber)} ·{" "}
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
      </div>

      {isManager ? (
        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-lg font-semibold">Your manager profile</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Shown on your team page and anywhere your manager name appears. Paste a
            direct link to an image (Imgur, Discord CDN, etc.).
          </p>
          <form action={updateProfileAction} className="mt-4 space-y-3">
            <input type="hidden" name="username" value={user.username} />
            <input type="hidden" name="displayName" value={user.displayName ?? ""} />
            <input
              type="hidden"
              name="returnTo"
              value={`/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}`}
            />
            <div className="flex items-center gap-3">
              <ManagerAvatar user={user} size={64} />
              <div className="min-w-0 flex-1">
                <label className="text-xs text-zinc-500" htmlFor="profilePictureUrl">
                  Profile picture URL
                </label>
                <input
                  id="profilePictureUrl"
                  name="profilePictureUrl"
                  type="url"
                  defaultValue={user.profilePictureUrl ?? ""}
                  placeholder="https://…"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
              </div>
            </div>
            <button type="submit" className="msb-btn-primary px-3 py-1 text-sm">
              Save profile picture
            </button>
          </form>
        </section>
      ) : null}

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
              <>
                <div>
                  <label className="text-xs text-zinc-500">Manager username</label>
                  <input
                    name="managerUsername"
                    defaultValue={manager?.username ?? ""}
                    placeholder="Assign directly (optional)"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                  />
                </div>
                {!manager ? (
                  <div>
                    <label className="text-xs text-zinc-500">
                      Reserve for username
                    </label>
                    <p className="text-xs text-zinc-600">
                      Set or change anytime before the team is claimed. Leave blank
                      to allow any league member to claim.
                    </p>
                    <input
                      name="claimUsername"
                      defaultValue={team.claimUsername ?? ""}
                      placeholder="Only this user can claim"
                      className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                    />
                  </div>
                ) : null}
              </>
            ) : null}
            <div>
              <label className="text-xs text-zinc-500">Home stadium</label>
              <StadiumSelect
                defaultValue={team.homeStadiumGameId}
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
    </PageShell>
  );
}
