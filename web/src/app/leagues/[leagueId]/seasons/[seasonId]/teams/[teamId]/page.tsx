import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { characters, rosterInstances, teams, users } from "@/db/schema";
import { BattingStatCells } from "@/components/BattingStatCells";
import { CharacterIcon } from "@/components/CharacterIcon";
import { GameMatchupInline } from "@/components/games/GameMatchupScore";
import { ManagerAvatar } from "@/components/ManagerAvatar";
import { battingStatHeaders, pitchingStatHeaders } from "@/components/stats/stat-table-headers";
import { PitchingTableRow } from "@/components/PitchingStatCells";
import { StadiumSelect } from "@/components/StadiumSelect";
import { getCurrentUser } from "@/lib/auth";
import { formatCharIdDisplay } from "@/lib/character-display";
import { managerDisplayName } from "@/lib/manager-profile";
import { getLeagueRole } from "@/lib/league-access";
import {
  aggregateBattingByCharId,
  aggregateBattingByCharOccurrence,
  aggregateFormerRosterTeamStats,
  aggregatePitchingByCharId,
  aggregatePitchingByCharOccurrence,
} from "@/lib/game-stats-queries";
import {
  currentRosterCharIds,
  resolveBattingLineForRosterCopy,
  resolvePitchingLineForRosterCopy,
} from "@/lib/team-roster-stats";
import {
  isTeamHomeInGame,
  resolveGameFieldSides,
  teamScoresFromFieldSides,
} from "@/domain/stats/resolve-game-field-sides";
import { normalizeStadiumId } from "@/domain/stats/stadium-id";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { stadiumIconUrl } from "@/lib/asset-urls";
import { scheduleRoundShortLabel } from "@/lib/schedule-labels";
import { updateTeamAction, updateProfileAction } from "@/server/actions";
import { PageShell } from "@/components/PageShell";
import { PageHero } from "@/components/PageHero";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string; teamId: string }>;
  searchParams: Promise<{ e?: string; m?: string }>;
};

export default async function TeamPage({ params, searchParams }: Props) {
  const { leagueId, seasonId, teamId } = await params;
  const { e, m } = await searchParams;
  const user = await getCurrentUser();

  const role = await getLeagueRole(leagueId, user);

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

  const [
    battingByOccurrence,
    battingByCharId,
    pitchingByOccurrence,
    pitchingByCharId,
  ] = await Promise.all([
    aggregateBattingByCharOccurrence({ seasonId, teamId }),
    aggregateBattingByCharId({ seasonId, teamId }),
    aggregatePitchingByCharOccurrence({ seasonId, teamId }),
    aggregatePitchingByCharId({ seasonId, teamId }),
  ]);

  const rosterCopyCounts = new Map<string, number>();
  for (const { character } of roster) {
    rosterCopyCounts.set(
      character.gameCharId,
      (rosterCopyCounts.get(character.gameCharId) ?? 0) + 1,
    );
  }

  const rosterCharIds = currentRosterCharIds(
    roster.map(({ character }) => ({ gameCharId: character.gameCharId })),
  );
  const offRoster = await aggregateFormerRosterTeamStats(
    seasonId,
    teamId,
    rosterCharIds,
  );

  const offRosterCharIds = [...offRoster.charIds].filter(
    (charId) => offRoster.batting.has(charId) || offRoster.pitching.has(charId),
  );
  const offRosterCharacters =
    offRosterCharIds.length > 0
      ? await db
          .select()
          .from(characters)
          .where(inArray(characters.gameCharId, offRosterCharIds))
      : [];
  const offRosterCharMap = new Map(
    offRosterCharacters.map((character) => [character.gameCharId, character]),
  );

  const rosterPitchers = roster
    .map(({ character, instance }) => {
      const copyCount = rosterCopyCounts.get(character.gameCharId) ?? 1;
      const line = resolvePitchingLineForRosterCopy(
        character.gameCharId,
        instance.copyIndex,
        copyCount,
        pitchingByOccurrence,
        pitchingByCharId,
      );
      return { character, instance, line };
    })
    .filter(
      ({ line }) =>
        line != null && (line.outsPitched > 0 || line.battersFaced > 0 || line.games > 0),
    )
    .sort((a, b) => a.character.displayName.localeCompare(b.character.displayName));

  const stadiumRow = team.homeStadiumGameId
    ? dash.stadiums.find((s) => s.gameStadiumId === team.homeStadiumGameId)
    : null;
  const stadiumImg = stadiumRow?.iconFile
    ? stadiumIconUrl(stadiumRow.iconFile)
    : null;

  const isAdmin = role === "admin";
  const isManager = user != null && team.managerUserId === user.id;
  const canEdit = isAdmin || isManager;

  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));

  const teamGames = dash.games
    .filter(
      (g) => g.game.homeTeamId === teamId || g.game.awayTeamId === teamId,
    )
    .map(({ game, round }) => {
      const played = game.playedAt != null && game.homeScore != null && game.awayScore != null;
      const fieldSides = resolveGameFieldSides(game);
      const isHome = played
        ? isTeamHomeInGame(teamId, fieldSides)
        : game.homeTeamId === teamId;
      const oppId = isHome ? fieldSides.awayTeamId : fieldSides.homeTeamId;
      const opp = dash.teams.find((t) => t.team.id === oppId);
      let result: "W" | "L" | null = null;
      if (played) {
        const scores = teamScoresFromFieldSides(
          teamId,
          fieldSides,
          game.awayScore!,
          game.homeScore!,
        );
        if (scores) {
          result = scores.ours > scores.theirs ? "W" : "L";
        }
      }
      const hadHomeField = played && fieldSides.fromStats && isHome;
      return { game, round, isHome, opp, played, result, hadHomeField, fieldSides };
    });

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={`${dash.league.name} · ${dash.season.name}`}
        title={team.name}
        backHref={`/leagues/${leagueId}/seasons/${seasonId}`}
        backLabel="Season"
      />
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
              {battingStatHeaders({ className: "py-2 pr-2", includeObpSlg: true })}
            </tr>
          </thead>
          <tbody>
            {roster.map(({ character, instance }) => {
              const copyCount = rosterCopyCounts.get(character.gameCharId) ?? 1;
              const line = resolveBattingLineForRosterCopy(
                character.gameCharId,
                instance.copyIndex,
                copyCount,
                battingByOccurrence,
                battingByCharId,
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
                      <CharacterIcon charId={character.gameCharId} size={28} />
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
          {teamGames.map(({ game, round, isHome, opp, played, result, hadHomeField }) => (
            <li
              key={game.id}
              className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-500">
                  {scheduleRoundShortLabel(round.phase, round.roundNumber)} ·{" "}
                  {isHome ? "vs" : "@"}{" "}
                </span>
                {played ? (
                  <>
                    <GameMatchupInline
                      awayName={teamNames.get(game.awayTeamId) ?? "?"}
                      homeName={teamNames.get(game.homeTeamId) ?? "?"}
                      awayScore={game.awayScore!}
                      homeScore={game.homeScore!}
                    />
                    <span
                      className={
                        result === "W" ? "font-semibold text-amber-400" : "text-zinc-500"
                      }
                    >
                      {result}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{opp?.team.name ?? "?"}</span>
                    <span className="text-zinc-500">Scheduled</span>
                  </>
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
              {game.statsStadiumId || hadHomeField ? (
                <p className="mt-1 text-xs text-zinc-600">
                  {game.statsStadiumId
                    ? normalizeStadiumId(game.statsStadiumId)
                    : null}
                  {game.statsStadiumId && hadHomeField ? " · " : null}
                  {hadHomeField ? "Home field" : null}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Season pitching</h2>
        <p className="text-sm text-zinc-500">
          Pitching totals from uploaded game stats this season.
        </p>
        <div className="msb-table-wrap mt-3">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-2 pr-2">Character</th>
                {pitchingStatHeaders({ className: "py-2 pr-2" })}
              </tr>
            </thead>
            <tbody>
              {rosterPitchers.length > 0 ? (
                rosterPitchers.map(({ character, instance, line }) => {
                  const showCopy =
                    (rosterCopyCounts.get(character.gameCharId) ?? 0) > 1;
                  return (
                    <tr key={instance.id} className="border-b border-zinc-900">
                      <td className="py-2 pr-2">
                        <Link
                          href={`/leagues/${leagueId}/characters/${encodeURIComponent(character.gameCharId)}?season=${seasonId}&tab=pitching`}
                          className="flex items-center gap-2 hover:text-amber-400"
                        >
                          <CharacterIcon charId={character.gameCharId} size={28} />
                          {character.displayName}
                          {showCopy ? (
                            <span className="text-zinc-500">#{instance.copyIndex}</span>
                          ) : null}
                        </Link>
                      </td>
                      <PitchingTableRow line={line!} />
                    </tr>
                  );
                })
              ) : (
                <tr className="border-b border-zinc-900 text-zinc-500">
                  <td className="py-2 pr-2" colSpan={11}>
                    No pitching stats recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {offRosterCharIds.length > 0 ? (
        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
          <h2 className="text-lg font-semibold">Former roster</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Characters who played for this team earlier in the season but are not on the
            current roster and did not appear in the most recent uploaded game.
          </p>

          {[...offRoster.batting.entries()].length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-400">Batting</h3>
              <div className="msb-table-wrap mt-2">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="py-2 pr-2">Character</th>
                      {battingStatHeaders({ className: "py-2 pr-2", includeObpSlg: true })}
                    </tr>
                  </thead>
                  <tbody>
                    {[...offRoster.batting.entries()]
                      .sort(([, a], [, b]) => {
                        const nameA =
                          offRosterCharMap.get(a.charId)?.displayName ??
                          formatCharIdDisplay(a.charId);
                        const nameB =
                          offRosterCharMap.get(b.charId)?.displayName ??
                          formatCharIdDisplay(b.charId);
                        return nameA.localeCompare(nameB);
                      })
                      .map(([charId, line]) => {
                        const character = offRosterCharMap.get(line.charId);
                        return (
                          <tr key={charId} className="border-b border-zinc-900">
                            <td className="py-2 pr-2">
                              <Link
                                href={`/leagues/${leagueId}/characters/${encodeURIComponent(line.charId)}?season=${seasonId}`}
                                className="flex items-center gap-2 hover:text-amber-400"
                              >
                                  <CharacterIcon charId={line.charId} size={28} />
                                {character?.displayName ?? formatCharIdDisplay(line.charId)}
                              </Link>
                            </td>
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
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {[...offRoster.pitching.entries()].length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-400">Pitching</h3>
              <div className="msb-table-wrap mt-2">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="py-2 pr-2">Character</th>
                      {pitchingStatHeaders({ className: "py-2 pr-2" })}
                    </tr>
                  </thead>
                  <tbody>
                    {[...offRoster.pitching.entries()]
                      .sort(([, a], [, b]) => {
                        const nameA =
                          offRosterCharMap.get(a.charId)?.displayName ??
                          formatCharIdDisplay(a.charId);
                        const nameB =
                          offRosterCharMap.get(b.charId)?.displayName ??
                          formatCharIdDisplay(b.charId);
                        return nameA.localeCompare(nameB);
                      })
                      .map(([charId, line]) => {
                        const character = offRosterCharMap.get(line.charId);
                        return (
                          <tr key={charId} className="border-b border-zinc-900">
                            <td className="py-2 pr-2">
                              <Link
                                href={`/leagues/${leagueId}/characters/${encodeURIComponent(line.charId)}?season=${seasonId}&tab=pitching`}
                                className="flex items-center gap-2 hover:text-amber-400"
                              >
                                  <CharacterIcon charId={line.charId} size={28} />
                                {character?.displayName ?? formatCharIdDisplay(line.charId)}
                              </Link>
                            </td>
                            <PitchingTableRow line={line} />
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

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
