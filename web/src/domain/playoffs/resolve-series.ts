import { winsNeeded, type BestOf } from "@/domain/playoffs/playoff-settings";

export type SeriesGame = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
};

export type SeriesResult = {
  seriesKey: string;
  homeTeamId: string;
  awayTeamId: string;
  homeWins: number;
  awayWins: number;
  bestOf: BestOf;
  winnerId: string | null;
  games: SeriesGame[];
  complete: boolean;
};

function seriesKeyForTeams(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join(":");
}

/** Group playoff games between the same two teams in a round into a series. */
export function resolveSeriesFromGames(
  games: SeriesGame[],
  bestOf: BestOf,
): SeriesResult[] {
  const byPair = new Map<string, SeriesGame[]>();

  for (const game of games) {
    const key = seriesKeyForTeams(game.homeTeamId, game.awayTeamId);
    const list = byPair.get(key) ?? [];
    list.push(game);
    byPair.set(key, list);
  }

  const needed = winsNeeded(bestOf);
  const results: SeriesResult[] = [];

  for (const [key, pairGames] of byPair) {
    const [homeTeamId, awayTeamId] = key.split(":");
    let homeWins = 0;
    let awayWins = 0;

    for (const game of pairGames) {
      if (!game.played || game.homeScore == null || game.awayScore == null) continue;
      if (game.homeScore === game.awayScore) continue;
      const homeWon = game.homeScore > game.awayScore;
      if (game.homeTeamId === homeTeamId) {
        if (homeWon) homeWins++;
        else awayWins++;
      } else {
        if (homeWon) awayWins++;
        else homeWins++;
      }
    }

    const winnerId =
      homeWins >= needed ? homeTeamId : awayWins >= needed ? awayTeamId : null;

    results.push({
      seriesKey: key,
      homeTeamId: homeTeamId!,
      awayTeamId: awayTeamId!,
      homeWins,
      awayWins,
      bestOf,
      winnerId,
      games: pairGames,
      complete: winnerId != null,
    });
  }

  return results;
}
