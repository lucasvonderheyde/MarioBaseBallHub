import { describe, expect, it } from "vitest";
import {
  findHighestScoringFullInning,
  findHighestScoringHalfInning,
  parseLineScoreFromEvents,
} from "@/domain/stats/parse-line-score";

describe("parseLineScoreFromEvents", () => {
  it("returns null when Events are missing", () => {
    expect(parseLineScoreFromEvents({})).toBeNull();
  });

  it("builds runs by inning from half-inning score deltas", () => {
    const lineScore = parseLineScoreFromEvents({
      Events: [
        { Inning: 1, "Half Inning": 0, "Away Score": 0, "Home Score": 0 },
        { Inning: 1, "Half Inning": 0, "Away Score": 2, "Home Score": 0 },
        { Inning: 1, "Half Inning": 1, "Away Score": 2, "Home Score": 0 },
        { Inning: 1, "Half Inning": 1, "Away Score": 2, "Home Score": 1 },
        { Inning: 2, "Half Inning": 0, "Away Score": 2, "Home Score": 1 },
        { Inning: 2, "Half Inning": 0, "Away Score": 3, "Home Score": 1 },
      ],
    });

    expect(lineScore).toEqual({
      inningNumbers: [1, 2],
      awayRunsByInning: [2, 1],
      homeRunsByInning: [1, 0],
      awayTotal: 3,
      homeTotal: 1,
    });

    expect(findHighestScoringHalfInning(lineScore!)).toEqual({
      inning: 1,
      side: "away",
      runs: 2,
    });
    expect(findHighestScoringFullInning(lineScore!)).toEqual({
      inning: 1,
      runs: 3,
    });
  });
});
