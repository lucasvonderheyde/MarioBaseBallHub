import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  characters,
  seasonCharacterPool,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { parseTiebreakerOrder } from "@/domain/standings/tiebreakers";
import { UploadStatsForm } from "@/components/UploadStatsForm";
import { BackfillStatsButton } from "@/components/BackfillStatsButton";
import {
  addScheduleGameAction,
  clearGameStatsAction,
  createRoundAction,
  createTeamAction,
  renameSeasonAction,
  savePoolAction,
  saveYoutubeFormAction,
} from "@/server/actions";
import { characterMugshotUrl } from "@/lib/asset-urls";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string }>;
  searchParams: Promise<{ e?: string; m?: string }>;
};

export default async function SeasonPage({ params, searchParams }: Props) {
  const { leagueId, seasonId } = await params;
  const { e, m } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const { season, league, teams, rounds, games } = dash;
  const isAdmin = role === "admin";

  const charRows = await db
    .select({
      character: characters,
      poolCopies: seasonCharacterPool.leagueCopies,
    })
    .from(characters)
    .leftJoin(
      seasonCharacterPool,
      and(
        eq(seasonCharacterPool.seasonId, seasonId),
        eq(seasonCharacterPool.characterId, characters.id),
      ),
    )
    .orderBy(asc(characters.displayName));

  const gamesByRound = new Map<string, typeof games>();
  for (const g of games) {
    const k = g.round.id;
    if (!gamesByRound.has(k)) gamesByRound.set(k, []);
    gamesByRound.get(k)!.push(g);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link
            href={`/leagues/${leagueId}`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            {league.name}
          </Link>
          <h1 className="text-2xl font-bold">{season.name}</h1>
        </div>
        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs capitalize text-zinc-400">
          {season.status}
        </span>
      </div>

      {e ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "renamed" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Season renamed.
        </p>
      ) : null}
      <p className="mt-2 text-sm text-zinc-500">
        Tiebreakers (in order):{" "}
        <span className="font-mono text-zinc-300">
          {parseTiebreakerOrder(season.tiebreakerOrder).join(" → ")}
        </span>
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link
          href={`/leagues/${leagueId}/characters?season=${seasonId}`}
          className="text-amber-400 hover:underline"
        >
          Character library
        </Link>
        <Link
          href={`/leagues/${leagueId}/stadiums?season=${seasonId}`}
          className="text-amber-400 hover:underline"
        >
          Stadium library
        </Link>
      </div>

      <section className="mt-10" id="standings">
        <h2 className="text-lg font-semibold">Standings</h2>
        <p className="text-sm text-zinc-500">
          Regular-season games only. Playoff rows on the schedule do not affect
          this table yet.
        </p>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Team</th>
              <th className="py-2 pr-2">W</th>
              <th className="py-2 pr-2">L</th>
              <th className="py-2 pr-2">RF</th>
              <th className="py-2 pr-2">RA</th>
            </tr>
          </thead>
          <tbody>
            {dash.standings.map((row, i) => (
              <tr key={row.teamId} className="border-b border-zinc-900">
                <td className="py-2 pr-2 text-zinc-500">{i + 1}</td>
                <td className="py-2 pr-2">
                  <Link
                    href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${row.teamId}`}
                    className="text-amber-400 hover:underline"
                  >
                    {row.name}
                  </Link>
                  {row.needsTiebreakerGame ? (
                    <span className="ml-2 text-xs text-amber-300">
                      (tiebreaker game)
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-2">{row.wins}</td>
                <td className="py-2 pr-2">{row.losses}</td>
                <td className="py-2 pr-2">{row.runsFor}</td>
                <td className="py-2 pr-2">{row.runsAgainst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10" id="schedule">
        <h2 className="text-lg font-semibold">Schedule</h2>
        <div className="mt-4 space-y-8">
          {rounds.map((r) => (
            <div key={r.id}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                {r.phase === "playoffs" ? "Playoffs" : "Regular"} · Round{" "}
                {r.roundNumber}
              </h3>
              <ul className="mt-2 space-y-4">
                {(gamesByRound.get(r.id) ?? []).map(({ game }) => {
                  const home = teams.find((t) => t.team.id === game.homeTeamId);
                  const away = teams.find((t) => t.team.id === game.awayTeamId);
                  return (
                    <li
                      key={game.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">
                          {away?.team.name ?? "?"} @ {home?.team.name ?? "?"}
                        </span>
                        {game.playedAt ? (
                          <span className="text-zinc-400">
                            {game.awayScore}-{game.homeScore} (away-home)
                          </span>
                        ) : (
                          <span className="text-zinc-500">Not played</span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">
                        Slot {game.slotInRound} · Game ID{" "}
                        <span className="font-mono">{game.id.slice(0, 8)}…</span>
                        {game.statsGameId ? (
                          <>
                            {" "}
                            · Stats{" "}
                            <span className="font-mono">{game.statsGameId}</span>
                          </>
                        ) : null}
                        {game.statsRawJson ? (
                          <>
                            {" "}
                            ·{" "}
                            <Link
                              href={`/leagues/${leagueId}/seasons/${seasonId}/games/${game.id}`}
                              className="text-amber-400 hover:underline"
                            >
                              Box score
                            </Link>
                          </>
                        ) : null}
                      </div>
                      <form
                        action={saveYoutubeFormAction}
                        className="mt-3 flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="gameId" value={game.id} />
                        <input type="hidden" name="leagueId" value={leagueId} />
                        <input type="hidden" name="seasonId" value={seasonId} />
                        <input
                          name="youtube"
                          defaultValue={game.youtubeUrl ?? ""}
                          placeholder="YouTube URL"
                          className="min-w-[220px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded border border-zinc-600 px-2 py-1 text-xs"
                        >
                          Save link
                        </button>
                      </form>
                      <div className="mt-3">
                        <UploadStatsForm
                          gameId={game.id}
                          leagueId={leagueId}
                          seasonId={seasonId}
                        />
                      </div>
                      {isAdmin && game.statsGameId ? (
                        <form
                          action={clearGameStatsAction.bind(
                            null,
                            game.id,
                            leagueId,
                            seasonId,
                          )}
                          className="mt-2"
                        >
                          <button
                            type="submit"
                            className="text-xs text-red-400 hover:underline"
                          >
                            Clear stats (admin)
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {isAdmin ? (
        <section className="mt-12 space-y-10 rounded-lg border border-amber-900/40 bg-amber-950/10 p-6">
          <h2 className="text-lg font-semibold text-amber-200">Admin</h2>

          <div>
            <h3 className="font-medium">Rename season</h3>
            <form
              action={renameSeasonAction.bind(null, seasonId, leagueId)}
              className="mt-2 flex flex-wrap gap-2"
            >
              <input
                name="name"
                required
                defaultValue={season.name}
                className="min-w-[200px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
              <button
                type="submit"
                className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Save name
              </button>
            </form>
          </div>

          <div>
            <h3 className="font-medium">Team claims</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Share this link so managers can register and claim their team. Leave
              manager blank when creating teams; optionally reserve a username.
            </p>
            <p className="mt-2 break-all font-mono text-xs text-amber-300/90">
              /leagues/{leagueId}/claim
            </p>
            <Link
              href={`/leagues/${leagueId}/claim`}
              className="mt-2 inline-block text-sm text-amber-400 hover:underline"
            >
              Preview claim page →
            </Link>
          </div>

          <div>
            <h3 className="font-medium">Teams</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              {teams.map(({ team, manager }) => (
                <li key={team.id}>
                  <Link
                    href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${team.id}`}
                    className="text-amber-400 hover:underline"
                  >
                    {team.name}
                  </Link>
                  {manager
                    ? ` — ${manager.username}`
                    : team.claimUsername
                      ? ` — reserved for ${team.claimUsername}`
                      : " — unclaimed"}
                </li>
              ))}
            </ul>
            <form
              action={createTeamAction.bind(null, seasonId)}
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
            >
              <input
                name="name"
                required
                placeholder="Team name"
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
              <input
                name="managerUsername"
                placeholder="Manager username (if already registered)"
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
              <input
                name="claimUsername"
                placeholder="Reserve for username (claim later)"
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
              <input
                name="homeStadium"
                placeholder="Home stadium (game name, e.g. Bowser Castle)"
                className="min-w-[240px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
              <button
                type="submit"
                className="msb-btn-primary px-3 py-1 text-sm"
              >
                Add team
              </button>
            </form>
          </div>

          <div>
            <h3 className="font-medium">Rounds</h3>
            <form
              action={createRoundAction.bind(null, seasonId, leagueId)}
              className="mt-2 flex flex-wrap items-end gap-2"
            >
              <div>
                <label className="text-xs text-zinc-500">Phase</label>
                <select
                  name="phase"
                  className="block rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                >
                  <option value="regular">Regular</option>
                  <option value="playoffs">Playoffs</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Round #</label>
                <input
                  name="roundNumber"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="block w-20 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
              </div>
              <button
                type="submit"
                className="rounded border border-zinc-600 px-3 py-1 text-sm"
              >
                Add round
              </button>
            </form>
          </div>

          <div>
            <h3 className="font-medium">Schedule game</h3>
            <form
              action={addScheduleGameAction.bind(null, seasonId, leagueId)}
              className="mt-2 grid gap-2 sm:grid-cols-2"
            >
              <select
                name="roundId"
                required
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm sm:col-span-2"
              >
                <option value="">Select round</option>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.phase} R{r.roundNumber}
                  </option>
                ))}
              </select>
              <input
                name="slot"
                type="number"
                min={1}
                defaultValue={1}
                placeholder="Slot in round"
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
              <select
                name="awayTeamId"
                required
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              >
                <option value="">Away team</option>
                {teams.map(({ team }) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <select
                name="homeTeamId"
                required
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              >
                <option value="">Home team</option>
                {teams.map(({ team }) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-950 sm:col-span-2"
              >
                Add game
              </button>
            </form>
          </div>

          <div>
            <h3 className="font-medium">Character pool (league copies)</h3>
            <p className="text-sm text-zinc-500">
              Set how many of each character exist this season, then assign them
              on the roster page.
            </p>
            <form action={savePoolAction.bind(null, seasonId)} className="mt-3">
              <div className="max-h-80 overflow-y-auto rounded border border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="p-2">Character</th>
                      <th className="p-2">Copies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charRows.map(({ character: c, poolCopies }) => (
                      <tr key={c.id} className="border-b border-zinc-900">
                        <td className="flex items-center gap-2 p-2">
                          {c.mugshotFile ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={
                                c.mugshotFile
                                  ? characterMugshotUrl(c.mugshotFile)
                                  : ""
                              }
                              alt=""
                              width={28}
                              height={28}
                              className="rounded"
                            />
                          ) : null}
                          <span>
                            {c.displayName}
                            <span className="ml-1 font-mono text-zinc-600">
                              {c.gameCharId}
                            </span>
                          </span>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            name={`pool_${c.id}`}
                            defaultValue={poolCopies == null ? 0 : poolCopies}
                            className="w-16 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="submit"
                className="msb-btn-primary mt-3 px-3 py-1 text-sm"
              >
                Save pool
              </button>
            </form>
          </div>

          <div>
            <Link
              href={`/leagues/${leagueId}/seasons/${seasonId}/rosters`}
              className="text-amber-400 hover:underline"
            >
              Open roster assignment →
            </Link>
          </div>

          <div>
            <h3 className="font-medium">Parsed stats</h3>
            <p className="text-sm text-zinc-500">
              Backfill character box scores from existing uploaded JSON.
            </p>
            <div className="mt-2">
              <BackfillStatsButton seasonId={seasonId} leagueId={leagueId} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
