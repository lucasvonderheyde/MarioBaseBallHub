import {
  computeStandings,
  type FinishedGame,
} from "@/domain/standings/compute-standings";
import type { TiebreakerKey } from "@/domain/standings/tiebreakers";

export type RemainingGameOdds = {
  homeTeamId: string;
  awayTeamId: string;
  /** Probability the home team wins this game (0..1). */
  homeWinPct: number;
};

export type PlayoffProbabilityRow = {
  teamId: string;
  /** Fraction of simulations finishing inside the playoff cutoff (0..1). */
  playoffPct: number;
  /** Fraction of simulations finishing first overall (0..1). */
  topSeedPct: number;
};

/** Deterministic PRNG (mulberry32) so simulations are reproducible. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Monte Carlo playoff odds: simulates every remaining regular-season game
 * using the per-game win model, recomputes the full standings (including
 * configured tiebreakers) for each simulated season, and counts how often
 * each team lands inside the playoff cutoff.
 */
export function simulatePlayoffProbabilities(input: {
  teamIds: string[];
  teamNames: Map<string, string>;
  finishedGames: FinishedGame[];
  remainingGames: RemainingGameOdds[];
  tiebreakerOrder: TiebreakerKey[];
  playoffSpots: number;
  simulations?: number;
  seed?: number;
}): PlayoffProbabilityRow[] {
  const {
    teamIds,
    teamNames,
    finishedGames,
    remainingGames,
    tiebreakerOrder,
    playoffSpots,
  } = input;
  const simulations = input.simulations ?? 2000;
  const random = createRandom(input.seed ?? 1);

  const playoffCounts = new Map<string, number>();
  const topSeedCounts = new Map<string, number>();
  for (const teamId of teamIds) {
    playoffCounts.set(teamId, 0);
    topSeedCounts.set(teamId, 0);
  }

  const runs = remainingGames.length === 0 ? 1 : simulations;

  for (let sim = 0; sim < runs; sim++) {
    const games: FinishedGame[] = [...finishedGames];
    for (const game of remainingGames) {
      const homeWins = random() < game.homeWinPct;
      games.push({
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        homeScore: homeWins ? 1 : 0,
        awayScore: homeWins ? 0 : 1,
      });
    }

    const standings = computeStandings(teamIds, teamNames, games, tiebreakerOrder);
    standings.forEach((row, index) => {
      if (index < playoffSpots) {
        playoffCounts.set(row.teamId, (playoffCounts.get(row.teamId) ?? 0) + 1);
      }
      if (index === 0) {
        topSeedCounts.set(row.teamId, (topSeedCounts.get(row.teamId) ?? 0) + 1);
      }
    });
  }

  return teamIds.map((teamId) => ({
    teamId,
    playoffPct: (playoffCounts.get(teamId) ?? 0) / runs,
    topSeedPct: (topSeedCounts.get(teamId) ?? 0) / runs,
  }));
}
