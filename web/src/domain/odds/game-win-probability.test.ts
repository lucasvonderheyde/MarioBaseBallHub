import { describe, expect, it } from "vitest";
import { computeGameWinProbability } from "./game-win-probability";

describe("computeGameWinProbability", () => {
  it("favors the stronger home team", () => {
    const odds = computeGameWinProbability({ homePower: 60, awayPower: 40 });
    expect(odds.homeWinPct).toBeGreaterThan(0.55);
    expect(odds.homeWinPct + odds.awayWinPct).toBeCloseTo(1, 5);
  });

  it("shifts odds with head-to-head history", () => {
    const neutral = computeGameWinProbability({
      homePower: 50,
      awayPower: 50,
      h2hHomeWins: 0,
      h2hAwayWins: 0,
    });
    const awayDominant = computeGameWinProbability({
      homePower: 50,
      awayPower: 50,
      h2hHomeWins: 0,
      h2hAwayWins: 3,
    });
    expect(awayDominant.homeWinPct).toBeLessThan(neutral.homeWinPct);
  });
});
