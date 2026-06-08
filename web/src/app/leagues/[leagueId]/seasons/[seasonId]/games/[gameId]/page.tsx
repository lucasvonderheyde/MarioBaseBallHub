import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { scheduleGames } from "@/db/schema";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import { getCurrentUser } from "@/lib/auth";
import { formatCharIdDisplay } from "@/lib/character-display";
import { getLeagueRole } from "@/lib/league-access";
import { getGameCharacterStats } from "@/lib/game-stats-queries";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { stadiumIconUrl } from "@/lib/asset-urls";
import {
  formatRate,
  inningsPitched,
} from "@/domain/stats/batting-metrics";
import { parseCharacterGameStats } from "@/domain/stats/parse-character-game-stats";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string; gameId: string }>;
};

export default async function GameReportPage({ params }: Props) {
  const { leagueId, seasonId, gameId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const [game] = await db
    .select()
    .from(scheduleGames)
    .where(eq(scheduleGames.id, gameId))
    .limit(1);
  if (!game || !game.statsRawJson) notFound();

  const inSeason = dash.games.some((g) => g.game.id === gameId);
  if (!inSeason) notFound();

  const home = dash.teams.find((t) => t.team.id === game.homeTeamId);
  const away = dash.teams.find((t) => t.team.id === game.awayTeamId);
  if (!home || !away) notFound();

  const stats = await getGameCharacterStats(gameId);
  const meta = parseCharacterGameStats(JSON.parse(game.statsRawJson));

  const awayStats = stats.filter((s) => s.teamSide === "Away");
  const homeStats = stats.filter((s) => s.teamSide === "Home");

  const stadiumId = game.statsStadiumId ?? meta.stadiumId;
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
        <table className="mt-2 w-full text-left text-xs">
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
                      {formatCharIdDisplay(r.charId, r.isCaptain)}
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
    );
  }

  function PitchingLine(side: "Away" | "Home", teamName: string) {
    const pitcher = stats.find((s) => s.teamSide === side && s.wasPitcher);
    if (!pitcher) {
      return (
        <tr className="border-b border-zinc-900">
          <td className="py-1 pr-2">{teamName}</td>
          <td colSpan={7} className="py-1 text-zinc-500">
            No pitcher recorded
          </td>
        </tr>
      );
    }
    return (
      <tr className="border-b border-zinc-900">
        <td className="py-1 pr-2">{teamName}</td>
        <td className="py-1 pr-2">
          {formatCharIdDisplay(pitcher.charId, pitcher.isCaptain)}
        </td>
        <td className="py-1 pr-2 tabular-nums">
          {inningsPitched(pitcher.outsPitched)}
        </td>
        <td className="py-1 pr-2 tabular-nums">{pitcher.hitsAllowed}</td>
        <td className="py-1 pr-2 tabular-nums">{pitcher.runsAllowed}</td>
        <td className="py-1 pr-2 tabular-nums">{pitcher.earnedRuns}</td>
        <td className="py-1 pr-2 tabular-nums">
          {pitcher.pitchingWalks + pitcher.battersHit}
        </td>
        <td className="py-1 pr-2 tabular-nums">{pitcher.strikeoutsDef}</td>
        <td className="py-1 pr-2 tabular-nums">{pitcher.hrAllowed}</td>
      </tr>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href={`/leagues/${leagueId}/seasons/${seasonId}`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Season
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {away.team.name} @ {home.team.name}
      </h1>
      <p className="mt-1 text-lg text-zinc-300">
        {game.awayScore} – {game.homeScore}
      </p>
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

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <BoxTable rows={awayStats} label={away.team.name} />
        <BoxTable rows={homeStats} label={home.team.name} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Pitching</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-1 pr-2">Team</th>
              <th className="py-1 pr-2">Pitcher</th>
              <th className="py-1 pr-2">IP</th>
              <th className="py-1 pr-2">H</th>
              <th className="py-1 pr-2">R</th>
              <th className="py-1 pr-2">ER</th>
              <th className="py-1 pr-2">BB</th>
              <th className="py-1 pr-2">K</th>
              <th className="py-1 pr-2">HR</th>
            </tr>
          </thead>
          <tbody>
            {PitchingLine("Away", away.team.name)}
            {PitchingLine("Home", home.team.name)}
          </tbody>
        </table>
      </section>

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
        <h2 className="font-semibold text-zinc-200">Game notes</h2>
        <ul className="mt-2 space-y-1">
          {meta.inningsPlayed != null ? (
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
    </div>
  );
}
