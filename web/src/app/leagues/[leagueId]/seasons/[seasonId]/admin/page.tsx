import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, seasonCharacterPool } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, isLeagueAdmin } from "@/lib/league-access";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import {
  DEFAULT_PLAYOFF_SETTINGS,
  parsePlayoffSettings,
} from "@/domain/playoffs/playoff-settings";
import {
  parseSeasonScheduleSettings,
} from "@/domain/schedule/season-schedule-settings";
import { roundRobinGameCount } from "@/domain/schedule/generate-round-robin";
import { scheduleRoundHeading } from "@/lib/schedule-labels";
import { BackfillStatsButton } from "@/components/BackfillStatsButton";
import { PageShell } from "@/components/PageShell";
import { PageHero } from "@/components/PageHero";
import { StadiumSelect } from "@/components/StadiumSelect";
import {
  addScheduleGameAction,
  addWeeklyMatchupsAction,
  createRoundAction,
  createTeamAction,
  generateRoundRobinScheduleAction,
  organizeRoundRobinWeeksAction,
  renameSeasonAction,
  savePlayoffSettingsAction,
  saveScheduleSettingsAction,
  savePoolAction,
  updateSeasonStatusAction,
  updateTeamClaimUsernameAction,
} from "@/server/actions";
import { characterMugshotUrl } from "@/lib/asset-urls";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string }>;
  searchParams: Promise<{ e?: string; m?: string; count?: string; week?: string }>;
};

export default async function SeasonAdminPage({ params, searchParams }: Props) {
  const { leagueId, seasonId } = await params;
  const { e, m, count, week } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!isLeagueAdmin(role)) notFound();

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const { season, teams, rounds, games } = dash;
  const playoffSettings = parsePlayoffSettings(season.playoffSettings);
  const scheduleSettings = parseSeasonScheduleSettings(season.scheduleSettings);
  const teamCount = teams.length;
  const expectedRoundRobinGames = roundRobinGameCount(teamCount);

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

  const regularRounds = rounds.filter((r) => r.phase === "regular");
  const regularGameCount = games.filter((g) => g.round.phase === "regular").length;
  const nextWeek =
    regularRounds.length > 0
      ? Math.max(...regularRounds.map((r) => r.roundNumber)) + 1
      : 1;
  const showOrganizeWeeks =
    regularRounds.length === 1 && regularGameCount >= 2 && teamCount >= 2;

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={dash.league.name}
        title={season.name}
        badge={season.status}
        subtitle="Season admin — teams, schedule, character pool, and playoffs."
        backHref={`/leagues/${leagueId}/seasons/${seasonId}`}
        backLabel={season.name}
      />

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
      {m === "reservation-updated" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Team reservation updated.
        </p>
      ) : null}
      {m === "status-updated" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Season status updated.
        </p>
      ) : null}
      {m === "playoff-settings" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Playoff settings saved.
        </p>
      ) : null}
      {m === "schedule-settings" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Schedule settings saved.
        </p>
      ) : null}
      {m === "round-robin" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Added {count ?? "0"} round-robin games across weekly rounds.
        </p>
      ) : null}
      {m === "weekly-matchups" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Added {count ?? "0"} game(s) to week {week ?? "?"}.
        </p>
      ) : null}
      {m === "organize-weeks" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Moved {count ?? "0"} game(s) into weekly rounds.
        </p>
      ) : null}
        <section className="mt-12 rounded-lg border border-amber-900/40 bg-amber-950/10 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-amber-200">Admin</h2>

          <div className="msb-admin-grid mt-8">
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
            <h3 className="font-medium">Season status</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Mark one season as active so it appears first on league schedule and
              playoff pages.
            </p>
            <form
              action={updateSeasonStatusAction.bind(null, seasonId, leagueId)}
              className="mt-2 flex flex-wrap items-end gap-2"
            >
              <select
                name="status"
                defaultValue={season.status}
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              >
                <option value="setup">Setup</option>
                <option value="active">Active (current)</option>
                <option value="completed">Completed (past)</option>
              </select>
              <button
                type="submit"
                className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Save status
              </button>
            </form>
          </div>

          <div id="playoff-settings" className="msb-admin-span-2">
            <h3 className="font-medium">Playoff &amp; play-in settings</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Controls seeding on the{" "}
              <Link
                href={`/leagues/${leagueId}/standings?season=${seasonId}`}
                className="text-amber-400 hover:underline"
              >
                playoff picture
              </Link>
              . Schedule play-in games as Playoffs round{" "}
              {playoffSettings.playInRoundNumber} below.
            </p>
            <form
              action={savePlayoffSettingsAction.bind(null, seasonId, leagueId)}
              className="mt-3 grid max-w-lg gap-3 sm:grid-cols-2"
            >
              <div>
                <label className="text-xs text-zinc-500">Auto-qualify (top seeds)</label>
                <input
                  name="autoQualifyCount"
                  type="number"
                  min={0}
                  max={32}
                  defaultValue={playoffSettings.autoQualifyCount}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Play-in teams</label>
                <input
                  name="playInTeamCount"
                  type="number"
                  min={0}
                  max={16}
                  defaultValue={playoffSettings.playInTeamCount}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Play-in spots awarded</label>
                <input
                  name="playInSpots"
                  type="number"
                  min={0}
                  max={8}
                  defaultValue={playoffSettings.playInSpots}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Play-in schedule round #</label>
                <input
                  name="playInRoundNumber"
                  type="number"
                  min={1}
                  max={99}
                  defaultValue={playoffSettings.playInRoundNumber}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Main bracket teams</label>
                <input
                  name="mainBracketTeamCount"
                  type="number"
                  min={2}
                  max={32}
                  defaultValue={playoffSettings.mainBracketTeamCount}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Play-in best-of</label>
                <select
                  name="playInBestOf"
                  defaultValue={playoffSettings.playInBestOf}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                >
                  <option value={1}>Best of 1</option>
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                  <option value={7}>Best of 7</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Main rounds best-of</label>
                <select
                  name="mainRoundBestOf"
                  defaultValue={playoffSettings.mainRoundBestOf}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                >
                  <option value={1}>Best of 1</option>
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                  <option value={7}>Best of 7</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Finals best-of</label>
                <select
                  name="finalsBestOf"
                  defaultValue={playoffSettings.finalsBestOf}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                >
                  <option value={1}>Best of 1</option>
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                  <option value={7}>Best of 7</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    name="higherSeedHomeField"
                    defaultChecked={playoffSettings.higherSeedHomeField}
                    className="rounded border-zinc-600"
                  />
                  Higher seed gets home field
                </label>
              </div>
              <button
                type="submit"
                className="sm:col-span-2 w-fit rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Save playoff settings
              </button>
            </form>
            <p className="mt-2 text-xs text-zinc-600">
              12-team example: top {DEFAULT_PLAYOFF_SETTINGS.autoQualifyCount} auto,
              seeds 9–12 play in for {DEFAULT_PLAYOFF_SETTINGS.playInSpots} spots.
            </p>
          </div>

          <div className="msb-admin-span-2">
            <h3 className="font-medium">Team claims</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Share this link so managers can register and claim their team. Leave
              manager blank when creating teams. You can set or change the reserved
              username anytime before someone claims the team.
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

          <div className="msb-admin-span-2">
            <h3 className="font-medium">Teams</h3>
            <ul className="mt-2 space-y-3 text-sm">
              {teams.map(({ team, manager }) => (
                <li
                  key={team.id}
                  className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${team.id}`}
                      className="font-medium text-amber-400 hover:underline"
                    >
                      {team.name}
                    </Link>
                    {manager ? (
                      <span className="text-zinc-400">Manager: {manager.username}</span>
                    ) : (
                      <span className="text-zinc-500">Unclaimed</span>
                    )}
                  </div>
                  {!manager ? (
                    <form
                      action={updateTeamClaimUsernameAction.bind(
                        null,
                        team.id,
                        seasonId,
                        leagueId,
                      )}
                      className="mt-2 flex flex-wrap items-end gap-2"
                    >
                      <div className="min-w-[200px] flex-1">
                        <label
                          htmlFor={`claim-${team.id}`}
                          className="text-xs text-zinc-500"
                        >
                          Reserved for username
                        </label>
                        <input
                          id={`claim-${team.id}`}
                          name="claimUsername"
                          defaultValue={team.claimUsername ?? ""}
                          placeholder="Leave blank for anyone to claim"
                          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
                      >
                        Save
                      </button>
                    </form>
                  ) : null}
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
              <StadiumSelect className="min-w-[240px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" />
              <button
                type="submit"
                className="msb-btn-primary px-3 py-1 text-sm"
              >
                Add team
              </button>
            </form>
          </div>

          <div className="msb-admin-span-2" id="schedule-settings">
            <h3 className="font-medium">Regular season schedule</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Regular season uses <span className="text-zinc-300">weeks</span> — each
              week is one set of matchups (like a Challonge round). Add matchups week
              by week, or generate the full round robin split into weekly rounds.
            </p>

            {showOrganizeWeeks ? (
              <form
                action={organizeRoundRobinWeeksAction.bind(null, seasonId, leagueId)}
                className="mt-4 rounded border border-amber-900/40 bg-amber-950/20 p-3"
              >
                <p className="text-sm text-amber-100/90">
                  All {regularGameCount} games are in one week. Split them into
                  round-robin weekly rounds?
                </p>
                <button
                  type="submit"
                  className="mt-2 rounded border border-amber-700/60 px-3 py-1 text-sm text-amber-200 hover:bg-amber-950/40"
                >
                  Organize into weekly rounds
                </button>
              </form>
            ) : null}

            <form
              action={addWeeklyMatchupsAction.bind(null, seasonId, leagueId)}
              className="mt-4 space-y-3 rounded border border-zinc-800 bg-zinc-950/40 p-4"
            >
              <h4 className="text-sm font-medium text-zinc-200">Add week of matchups</h4>
              <p className="text-xs text-zinc-500">
                One matchup per line — copy from Challonge as{" "}
                <span className="font-mono text-zinc-400">Away @ Home</span> or{" "}
                <span className="font-mono text-zinc-400">Away vs Home</span>.
                Team names must match exactly (case-insensitive).
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-zinc-500">Week #</label>
                  <input
                    name="weekNumber"
                    type="number"
                    min={1}
                    defaultValue={nextWeek}
                    className="mt-1 block w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <textarea
                name="matchups"
                rows={6}
                placeholder={"Team A @ Team B\nTeam C vs Team D"}
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-sm"
              />
              <button type="submit" className="msb-btn-primary px-3 py-1 text-sm">
                Add matchups to week
              </button>
            </form>

            <form
              action={saveScheduleSettingsAction.bind(null, seasonId, leagueId)}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <div>
                <label className="text-xs text-zinc-500">Format label</label>
                <select
                  name="regularSeasonFormat"
                  defaultValue={scheduleSettings.regularSeasonFormat}
                  className="mt-1 block rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                >
                  <option value="manual">Manual — add weeks yourself</option>
                  <option value="round_robin">
                    Round robin — everyone plays once
                  </option>
                </select>
              </div>
              <button
                type="submit"
                className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Save format
              </button>
            </form>
            <form
              action={generateRoundRobinScheduleAction.bind(null, seasonId, leagueId)}
              className="mt-3"
            >
              <button
                type="submit"
                className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
                disabled={teamCount < 2}
              >
                Generate full round robin ({expectedRoundRobinGames} games)
              </button>
              <p className="mt-2 text-xs text-zinc-600">
                Creates missing pairings split across weekly rounds. Skips matchups
                that already exist.
              </p>
            </form>
          </div>

          <div>
            <h3 className="font-medium">Playoff rounds</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Regular season weeks are created automatically. Use this for playoff
              bracket rounds only.
            </p>
            <form
              action={createRoundAction.bind(null, seasonId, leagueId)}
              className="mt-2 flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="phase" value="playoffs" />
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
                Add playoff round
              </button>
            </form>
          </div>

          <div>
            <h3 className="font-medium">Add single game</h3>
            <form
              action={addScheduleGameAction.bind(null, seasonId, leagueId)}
              className="mt-2 grid gap-2 sm:grid-cols-2"
            >
              <select
                name="roundId"
                required
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm sm:col-span-2"
              >
                <option value="">Select week / round</option>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {scheduleRoundHeading(r.phase, r.roundNumber)}
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

          <div className="msb-admin-span-2">
            <h3 className="font-medium">Character pool (league copies)</h3>
            <p className="text-sm text-zinc-500">
              Set how many of each character exist this season, then assign them
              on the roster page.
            </p>
            <form action={savePoolAction.bind(null, seasonId)} className="mt-3">
              <div className="max-h-80 overflow-y-auto rounded border border-zinc-800">
                <div className="msb-table-wrap">
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
              </div>
              <button
                type="submit"
                className="msb-btn-primary mt-3 px-3 py-1 text-sm"
              >
                Save pool
              </button>
            </form>
          </div>

          <div className="msb-admin-span-2 flex flex-wrap items-center gap-x-6 gap-y-2">
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
          </div>
        </section>
    </PageShell>
  );
}
