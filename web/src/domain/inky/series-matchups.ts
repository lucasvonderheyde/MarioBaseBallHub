import type { getSeasonDashboard } from "@/lib/season-dashboard";

type DashboardGame = NonNullable<
  Awaited<ReturnType<typeof getSeasonDashboard>>
>["games"][number];

export type PlayoffSeriesMatchup = {
  seriesKey: string;
  roundId: string;
  roundNumber: number;
  phase: "playoffs" | "regular";
  awayTeamId: string;
  homeTeamId: string;
  games: DashboardGame[];
  playedCount: number;
  totalCount: number;
  isComplete: boolean;
};

/** Stable key for a two-team matchup within one round. */
export function seriesKeyForTeams(
  roundId: string,
  teamA: string,
  teamB: string,
): string {
  const [first, second] = [teamA, teamB].sort();
  return `${roundId}:${first}:${second}`;
}

function parseSeriesKey(key: string): {
  roundId: string;
  teamA: string;
  teamB: string;
} | null {
  const parts = key.split(":");
  if (parts.length !== 3) return null;
  const [roundId, teamA, teamB] = parts;
  if (!roundId || !teamA || !teamB) return null;
  return { roundId, teamA, teamB };
}

function isPlayed(game: DashboardGame["game"]): boolean {
  return game.statsRawJson != null && game.homeScore != null && game.awayScore != null;
}

/** Groups playoff (and regular) games into head-to-head series within the same round. */
export function listPlayoffSeriesMatchups(
  games: DashboardGame[],
): PlayoffSeriesMatchup[] {
  const byKey = new Map<string, DashboardGame[]>();

  for (const entry of games) {
    const { game, round } = entry;
    const key = seriesKeyForTeams(round.id, game.awayTeamId, game.homeTeamId);
    const list = byKey.get(key) ?? [];
    list.push(entry);
    byKey.set(key, list);
  }

  const matchups: PlayoffSeriesMatchup[] = [];

  for (const [seriesKey, seriesGames] of byKey) {
    if (seriesGames.length < 2) continue;
    const parsed = parseSeriesKey(seriesKey);
    if (!parsed) continue;

    const round = seriesGames[0]!.round;
    const played = seriesGames.filter((entry) => isPlayed(entry.game));

    matchups.push({
      seriesKey,
      roundId: parsed.roundId,
      roundNumber: round.roundNumber,
      phase: round.phase === "playoffs" ? "playoffs" : "regular",
      awayTeamId: parsed.teamA,
      homeTeamId: parsed.teamB,
      games: [...seriesGames].sort(
        (a, b) => a.game.slotInRound - b.game.slotInRound,
      ),
      playedCount: played.length,
      totalCount: seriesGames.length,
      isComplete: played.length === seriesGames.length,
    });
  }

  return matchups.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase === "playoffs" ? -1 : 1;
    if (a.roundNumber !== b.roundNumber) return b.roundNumber - a.roundNumber;
    return a.seriesKey.localeCompare(b.seriesKey);
  });
}

export function findSeriesMatchup(
  games: DashboardGame[],
  seriesKey: string,
): PlayoffSeriesMatchup | null {
  return listPlayoffSeriesMatchups(games).find((m) => m.seriesKey === seriesKey) ?? null;
}
