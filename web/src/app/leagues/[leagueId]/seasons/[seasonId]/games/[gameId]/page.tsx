import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { scheduleGames } from "@/db/schema";
import { CharacterIcon } from "@/components/CharacterIcon";
import { InningLineScoreTable } from "@/components/games/InningLineScoreTable";
import {
  winnerScoreClass,
  winnerTeamNameClass,
  gameWinnerSide,
} from "@/components/games/GameMatchupScore";
import {
  boxScoreBattingHeaders,
  pitchingStatHeaders,
} from "@/components/stats/stat-table-headers";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/PageShell";
import { GameStatsUploader } from "@/components/GameStatsUploader";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { getCurrentUser } from "@/lib/auth";
import { formatCharIdDisplay } from "@/lib/character-display";
import { canUserReportGame } from "@/lib/game-report-access";
import { getLeagueRole, leagueExists } from "@/lib/league-access";
import { getGameCharacterStats } from "@/lib/game-stats-queries";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { stadiumIconUrl } from "@/lib/asset-urls";
import {
  formatRate,
  inningsPitched,
} from "@/domain/stats/batting-metrics";
import { parseCharacterGameStats } from "@/domain/stats/parse-character-game-stats";
import {
  alignLineScoreToSchedule,
  parseLineScoreFromEvents,
} from "@/domain/stats/parse-line-score";
import { parseDecodedGameFile } from "@/domain/stats/decode-game-file";
import { resolveGameFieldSides } from "@/domain/stats/resolve-game-field-sides";
import { normalizeStadiumId } from "@/domain/stats/stadium-id";
import { managerDisplayName } from "@/lib/manager-profile";
import { saveYoutubeFormAction } from "@/server/actions";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string; gameId: string }>;
  searchParams: Promise<{ e?: string; m?: string }>;
};

export default async function GameReportPage({ params, searchParams }: Props) {
  const { leagueId, seasonId, gameId } = await params;
  const { e, m } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!(await leagueExists(leagueId))) notFound();

  const role = await getLeagueRole(leagueId, user);

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const [game] = await db
    .select()
    .from(scheduleGames)
    .where(eq(scheduleGames.id, gameId))
    .limit(1);
  if (!game) notFound();

  const inSeason = dash.games.some((g) => g.game.id === gameId);
  if (!inSeason) notFound();

  const home = dash.teams.find((t) => t.team.id === game.homeTeamId);
  const away = dash.teams.find((t) => t.team.id === game.awayTeamId);
  if (!home || !away) notFound();

  const canEdit = canUserReportGame(
    user.id,
    role,
    home.manager?.id,
    away.manager?.id,
  );

  const hasStats = game.statsRawJson != null;
  const played =
    game.playedAt != null && game.homeScore != null && game.awayScore != null;

  const stats = hasStats ? await getGameCharacterStats(gameId) : [];
  const statsJson = hasStats ? JSON.parse(game.statsRawJson!) : null;
  const meta = statsJson ? parseCharacterGameStats(statsJson) : null;
  const rawLineScore = statsJson ? parseLineScoreFromEvents(statsJson) : null;
  const lineScore =
    rawLineScore && played
      ? alignLineScoreToSchedule(
          rawLineScore,
          game.awayScore!,
          game.homeScore!,
        )
      : rawLineScore;

  const winner = played ? gameWinnerSide(game.awayScore!, game.homeScore!) : "tie";

  const awayTeamStats = stats.filter((row) => row.teamId === away.team.id);
  const homeTeamStats = stats.filter((row) => row.teamId === home.team.id);
  const awayHits = awayTeamStats.reduce((sum, row) => sum + row.hits, 0);
  const homeHits = homeTeamStats.reduce((sum, row) => sum + row.hits, 0);

  const fieldSides = resolveGameFieldSides(game);
  const fileSummary = hasStats ? parseDecodedGameFile(game.statsRawJson!) : null;
  const fieldAway = dash.teams.find((t) => t.team.id === fieldSides.awayTeamId);
  const fieldHome = dash.teams.find((t) => t.team.id === fieldSides.homeTeamId);
  const fieldAwayLabel = fieldSides.fromStats
    ? fieldAway?.manager != null
      ? managerDisplayName(fieldAway.manager)
      : fieldSides.awayPlayer ?? "—"
    : fileSummary?.awayPlayer ?? "—";
  const fieldHomeLabel = fieldSides.fromStats
    ? fieldHome?.manager != null
      ? managerDisplayName(fieldHome.manager)
      : fieldSides.homePlayer ?? "—"
    : fileSummary?.homePlayer ?? "—";
  function charDisplayName(
    rows: typeof stats,
    row: (typeof stats)[number],
  ): string {
    const duplicateCount = rows.filter((r) => r.charId === row.charId).length;
    const copyNumber =
      duplicateCount > 1 ? row.charOccurrenceIndex + 1 : undefined;
    return formatCharIdDisplay(row.charId, row.isCaptain, copyNumber);
  }

  const stadiumId = normalizeStadiumId(game.statsStadiumId ?? meta?.stadiumId ?? null);
  const stadiumRow = stadiumId
    ? dash.stadiums.find((s) => s.gameStadiumId === stadiumId)
    : null;

  function BoxTable({ rows }: { rows: typeof stats }) {
    return (
      <div>
        <div className="msb-table-wrap">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">Character</th>
                {boxScoreBattingHeaders()}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const avg = r.ab === 0 ? null : r.hits / r.ab;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-zinc-900 ${r.wasPitcher ? "bg-zinc-900/60" : ""}`}
                  >
                    <td className="py-1 pr-2 text-zinc-500">{r.rosterSlot}</td>
                    <td className="py-1 pr-2">
                      <span className="flex items-center gap-1.5">
                        <CharacterIcon charId={r.charId} size={24} />
                        {charDisplayName(rows, r)}
                        {r.wasPitcher ? (
                          <span title="Pitcher" className="text-amber-400">
                            ⚾
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{r.ab}</td>
                    <td className="py-1 pr-2 tabular-nums">{r.hits}</td>
                    <td className="py-1 pr-2 tabular-nums">{r.hr}</td>
                    <td className="py-1 pr-2 tabular-nums">{r.rbi}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {r.walks4ball + r.walksHbp}
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{r.strikeoutsOff}</td>
                    <td className="py-1 pr-2 tabular-nums">{formatRate(avg)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function PitchingBoxTable({ rows }: { rows: typeof stats }) {
    const pitchingRows = rows.filter(
      (row) => row.wasPitcher || row.outsPitched > 0 || row.battersFaced > 0,
    );

    return (
      <div>
        <div className="msb-table-wrap">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1 pr-2">Pitcher</th>
                {pitchingStatHeaders({ includeG: false })}
              </tr>
            </thead>
            <tbody>
              {pitchingRows.length > 0 ? (
                pitchingRows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-900">
                    <td className="py-1 pr-2">
                      <span className="flex items-center gap-1.5">
                        <CharacterIcon charId={row.charId} size={24} />
                        {charDisplayName(rows, row)}
                      </span>
                    </td>
                    <td className="py-1 pr-2 tabular-nums">
                      {inningsPitched(row.outsPitched)}
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{row.battersFaced}</td>
                    <td className="py-1 pr-2 tabular-nums">{row.hitsAllowed}</td>
                    <td className="py-1 pr-2 tabular-nums">{row.runsAllowed}</td>
                    <td className="py-1 pr-2 tabular-nums">{row.earnedRuns}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {row.pitchingWalks + row.battersHit}
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{row.strikeoutsDef}</td>
                    <td className="py-1 pr-2 tabular-nums">{row.hrAllowed}</td>
                    <td className="py-1 pr-2 tabular-nums">{row.pitchesThrown}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-zinc-900 text-zinc-500">
                  <td className="py-1 pr-2" colSpan={10}>
                    No pitching stats recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <PageShell width="wide">
      <Link
        href={`/leagues/${leagueId}/schedule`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Schedule
      </Link>

      <div className="mt-4 space-y-4">
        <Card>
          <div className="flex flex-col items-center text-center">
            {stadiumId && stadiumRow?.iconFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stadiumIconUrl(stadiumRow.iconFile)}
                alt=""
                width={192}
                height={192}
                className="mb-4 h-32 w-32 rounded-lg object-contain sm:h-48 sm:w-48"
              />
            ) : null}
            <h1 className="text-2xl font-bold sm:text-3xl">
              <span className={winnerTeamNameClass("away", winner)}>{away.team.name}</span>
              <span className="mx-2 font-normal text-zinc-500">@</span>
              <span className={winnerTeamNameClass("home", winner)}>{home.team.name}</span>
            </h1>
            {stadiumId ? (
              <p className="mt-1 text-sm text-zinc-500">{stadiumId}</p>
            ) : null}
            {played ? (
              <p className="mt-3 text-3xl font-semibold tabular-nums sm:text-4xl">
                <span className={winnerScoreClass("away", winner)}>{game.awayScore}</span>
                <span className="mx-2 text-zinc-600">–</span>
                <span className={winnerScoreClass("home", winner)}>{game.homeScore}</span>
              </p>
            ) : (
              <p className="mt-2 text-zinc-500">Scheduled — stats not reported yet</p>
            )}
          </div>
        </Card>

        {e ? (
          <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {e}
          </p>
        ) : null}
        {m === "video-saved" ? (
          <p className="rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            Video link saved.
          </p>
        ) : null}

        {played && lineScore ? (
          <Card title="Line score">
            <div className="mx-auto max-w-3xl overflow-x-auto">
              <InningLineScoreTable
                awayTeamName={away.team.name}
                homeTeamName={home.team.name}
                lineScore={lineScore}
                awayScore={game.awayScore!}
                homeScore={game.homeScore!}
                awayHits={awayHits}
                homeHits={homeHits}
              />
            </div>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <Card title="Video">
            {game.youtubeUrl ? (
              <div className="space-y-3">
                <YouTubeEmbed
                  url={game.youtubeUrl}
                  title={`${away.team.name} vs ${home.team.name}`}
                />
                <a
                  href={game.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-amber-400 hover:underline"
                >
                  Open on YouTube
                </a>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No video linked yet.</p>
            )}

            {canEdit ? (
              <form
                action={saveYoutubeFormAction}
                className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
              >
                <input type="hidden" name="gameId" value={game.id} />
                <input type="hidden" name="leagueId" value={leagueId} />
                <input type="hidden" name="seasonId" value={seasonId} />
                <div className="min-w-0 flex-1">
                  <label htmlFor="youtube-url" className="text-xs text-zinc-500">
                    YouTube URL (unlisted watch links work)
                  </label>
                  <input
                    id="youtube-url"
                    name="youtube"
                    type="url"
                    defaultValue={game.youtubeUrl ?? ""}
                    placeholder="https://www.youtube.com/watch?v=…"
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  Save video
                </button>
              </form>
            ) : null}
          </Card>

          {hasStats ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Card title={`${away.team.name} batting`}>
                <BoxTable rows={awayTeamStats} />
              </Card>
              <Card title={`${home.team.name} batting`}>
                <BoxTable rows={homeTeamStats} />
              </Card>
            </div>
          ) : canEdit ? (
            <Card title="Upload stats">
              <p className="text-sm text-zinc-500">
                Paste the decoded game JSON to populate the box score. Teams are matched
                from JSON away/home players and roster characters in the file.
              </p>
              <div className="mt-3 max-w-xl">
                <GameStatsUploader
                  gameId={game.id}
                  leagueId={leagueId}
                  seasonId={seasonId}
                />
              </div>
            </Card>
          ) : (
            <Card title="Box score">
              <p className="text-sm text-zinc-500">
                Box score will appear here after a manager uploads game stats.
              </p>
            </Card>
          )}
        </div>

        {hasStats ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={`${away.team.name} pitching`}>
              <PitchingBoxTable rows={awayTeamStats} />
            </Card>
            <Card title={`${home.team.name} pitching`}>
              <PitchingBoxTable rows={homeTeamStats} />
            </Card>
          </div>
        ) : null}

        <Card title="Game notes">
          <ul className="space-y-1 text-sm text-zinc-400">
            {meta?.inningsPlayed != null ? (
              <li>Innings played: {meta.inningsPlayed}</li>
            ) : null}
            {game.playedAt ? (
              <li>Recorded: {game.playedAt.toLocaleString()}</li>
            ) : null}
            {hasStats ? (
              <li>
                Away: {fieldAwayLabel} · Home: {fieldHomeLabel}
              </li>
            ) : (
              <li>
                Away: {away.manager?.displayName ?? away.manager?.username ?? "—"} ·
                Home: {home.manager?.displayName ?? home.manager?.username ?? "—"}
              </li>
            )}
            {hasStats && (fieldSides.fromStats ? fieldHome : fileSummary) ? (
              <li>
                Home field:{" "}
                {fieldSides.fromStats
                  ? fieldHome?.team.name
                  : fileSummary?.homePlayer}
                {stadiumId ? ` at ${stadiumId}` : null}
              </li>
            ) : null}
            {game.statsGameId ? (
              <li>
                Stats GameID:{" "}
                <span className="font-mono text-zinc-300">{game.statsGameId}</span>
              </li>
            ) : null}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
