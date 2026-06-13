import { rotateTickerLines } from "@/domain/inky/rotate-ticker-lines";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { getSeasonRecords } from "@/lib/season-records";

export async function getSeasonStatTickerLines(
  seasonId: string,
  maxLines = 8,
): Promise<string[]> {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash) return [];

  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));
  const lines: string[] = [];

  const leader = dash.standings[0];
  if (leader) {
    lines.push(`${leader.name} leads the standings at ${leader.wins}-${leader.losses}`);
  }

  const records = await getSeasonRecords(seasonId);
  for (const record of records.slice(0, 6)) {
    lines.push(`${record.title}: ${record.detail}`);
  }

  const recentResults = dash.games
    .filter(
      ({ game }) =>
        game.statsRawJson != null && game.homeScore != null && game.awayScore != null,
    )
    .sort(
      (a, b) => (b.game.playedAt?.getTime() ?? 0) - (a.game.playedAt?.getTime() ?? 0),
    )
    .slice(0, 4);

  for (const { game } of recentResults) {
    const away = teamNames.get(game.awayTeamId) ?? "Away";
    const home = teamNames.get(game.homeTeamId) ?? "Home";
    lines.push(`Final: ${away} ${game.awayScore} @ ${home} ${game.homeScore}`);
  }

  const hourSeed = Math.floor(Date.now() / (1000 * 60 * 60));
  return rotateTickerLines(lines, maxLines, hourSeed);
}
