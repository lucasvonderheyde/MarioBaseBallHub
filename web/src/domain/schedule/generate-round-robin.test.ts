import { describe, expect, it } from "vitest";
import {
  generateRoundRobinPairings,
  generateRoundRobinRounds,
  roundRobinGameCount,
  roundRobinWeekCount,
} from "./generate-round-robin";

describe("generate-round-robin", () => {
  it("creates each pairing once for four teams", () => {
    const matches = generateRoundRobinPairings(["a", "b", "c", "d"]);
    expect(matches).toHaveLength(6);
    const keys = new Set(
      matches.map((m) => [m.homeTeamId, m.awayTeamId].sort().join(":")),
    );
    expect(keys.size).toBe(6);
  });

  it("splits four teams into three weekly rounds", () => {
    const weeks = generateRoundRobinRounds(["a", "b", "c", "d"]);
    expect(weeks).toHaveLength(3);
    expect(weeks.every((w) => w.matchups.length === 2)).toBe(true);
    const all = weeks.flatMap((w) => w.matchups);
    expect(all).toHaveLength(6);
  });

  it("counts games and weeks for n teams", () => {
    expect(roundRobinGameCount(12)).toBe(66);
    expect(roundRobinWeekCount(12)).toBe(11);
    expect(roundRobinWeekCount(11)).toBe(11);
  });
});
