export type GameWinProbability = {
  homeWinPct: number;
  awayWinPct: number;
};

const HOME_FIELD_BOOST = 1.75;
const LOGISTIC_SCALE = 7.5;

/**
 * Logistic win model from blended team power ratings and optional H2H tilt.
 * League-season data only — callers should not pass friendly-game history.
 */
export function computeGameWinProbability(input: {
  homePower: number;
  awayPower: number;
  h2hHomeWins?: number;
  h2hAwayWins?: number;
}): GameWinProbability {
  const h2hHome = input.h2hHomeWins ?? 0;
  const h2hAway = input.h2hAwayWins ?? 0;
  const h2hTotal = h2hHome + h2hAway;
  const h2hTilt =
    h2hTotal > 0 ? ((h2hHome - h2hAway) / h2hTotal) * 4 : 0;

  const diff =
    input.homePower + HOME_FIELD_BOOST + h2hTilt - input.awayPower;
  const homeWinPct = 1 / (1 + Math.exp(-diff / LOGISTIC_SCALE));

  return {
    homeWinPct,
    awayWinPct: 1 - homeWinPct,
  };
}

export function formatWinPct(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}
