import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { scheduleGames } from "@/db/schema";
import { CharacterMugshot } from "@/components/CharacterMugshot";
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
import { normalizeStadiumId } from "@/domain/stats/stadium-id";
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
  const meta = hasStats
    ? parseCharacterGameStats(JSON.parse(game.statsRawJson!))
    : null;

  const awayTeamStats = stats.filter((row) => row.teamId === away.team.id);
  const homeTeamStats = stats.filter((row) => row.teamId === home.team.id);

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

  function BoxTable({
    rows,
    label,
  }: {
    rows: typeof stats;
    label: string;
  }) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-zinc-300">{label}</h3>
        <div className="msb-table-wrap mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">Character</th>
                <th className="py-1 pr-2">AB</th>
                <th className="py-1 pr-2">H</th>
                <th className="py-1 pr-2">HR</th>
                <th className="py-1 pr-2">RBI</th>
                <th className="py-1 pr-2">BB</th>
                <th className="py-1 pr-2">K</th>
                <th className="py-1 pr-2">AVG</th>
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
                        <CharacterMugshot charId={r.charId} size={24} />
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

  function PitchingBoxTable({
    rows,
    label,
  }: {
    rows: typeof stats;
    label: string;
  }) {
    const pitchingRows = rows.filter(
      (row) => row.wasPitcher || row.outsPitched > 0 || row.battersFaced > 0,
    );

    return (
      <div>
        <h3 className="text-sm font-semibold text-zinc-300">{label}</h3>
        <div className="msb-table-wrap mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1 pr-2">Pitcher</th>
                <th className="py-1 pr-2">IP</th>
                <th className="py-1 pr-2">BF</th>
                <th className="py-1 pr-2">H</th>
                <th className="py-1 pr-2">R</th>
                <th className="py-1 pr-2">ER</th>
                <th className="py-1 pr-2">BB</th>
                <th className="py-1 pr-2">K</th>
                <th className="py-1 pr-2">HR</th>
                <th className="py-1 pr-2">Pit</th>
              </tr>
            </thead>
            <tbody>
              {pitchingRows.length > 0 ? (
                pitchingRows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-900">
                    <td className="py-1 pr-2">
                      <span className="flex items-center gap-1.5">
                        <CharacterMugshot charId={row.charId} size={24} />
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
      <h1 className="mt-2 text-2xl font-bold">
        {away.team.name} @ {home.team.name}
      </h1>
      {played ? (
        <p className="mt-1 text-lg text-zinc-300">
          {game.awayScore} – {game.homeScore}
        </p>
      ) : (
        <p className="mt-1 text-zinc-500">Scheduled — stats not reported yet</p>
      )}

      {e ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "video-saved" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Video link saved.
        </p>
      ) : null}

      {stadiumId ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
          {stadiumRow?.iconFile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stadiumIconUrl(stadiumRow.iconFile)}
              alt=""
              width={32}
              height={32}
              className="rounded"
            />
          ) : null}
          {stadiumId}
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Video</h2>
        {game.youtubeUrl ? (
          <div className="mt-3 max-w-3xl">
            <YouTubeEmbed
              url={game.youtubeUrl}
              title={`${away.team.name} vs ${home.team.name}`}
            />
            <a
              href={game.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-amber-400 hover:underline"
            >
              Open on YouTube
            </a>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">No video linked yet.</p>
        )}

        {canEdit ? (
          <form
            action={saveYoutubeFormAction}
            className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end"
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
      </section>

      {hasStats ? (
        <>
          <section className="mt-10 grid gap-6 lg:grid-cols-2">
            <BoxTable rows={awayTeamStats} label={away.team.name} />
            <BoxTable rows={homeTeamStats} label={home.team.name} />
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-2">
            <PitchingBoxTable rows={awayTeamStats} label={`${away.team.name} pitching`} />
            <PitchingBoxTable rows={homeTeamStats} label={`${home.team.name} pitching`} />
          </section>
        </>
      ) : canEdit ? (
        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-lg font-semibold">Report stats</h2>
          <p className="mt-1 text-sm text-zinc-500">
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
        </section>
      ) : (
        <p className="mt-10 text-sm text-zinc-500">
          Box score will appear here after a manager uploads game stats.
        </p>
      )}

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        <h2 className="font-semibold text-zinc-200">Game notes</h2>
        <ul className="mt-2 space-y-1">
          {meta?.inningsPlayed != null ? (
            <li>Innings played: {meta.inningsPlayed}</li>
          ) : null}
          {game.playedAt ? (
            <li>Recorded: {game.playedAt.toLocaleString()}</li>
          ) : null}
          <li>
            Away: {away.manager?.displayName ?? away.manager?.username ?? "—"} ·
            Home: {home.manager?.displayName ?? home.manager?.username ?? "—"}
          </li>
          {game.statsGameId ? (
            <li>
              Stats GameID:{" "}
              <span className="font-mono text-zinc-300">{game.statsGameId}</span>
            </li>
          ) : null}
        </ul>
      </section>
    </PageShell>
  );
}
