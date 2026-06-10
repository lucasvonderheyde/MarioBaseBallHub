import { readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { gameStatisticsSamplesDirectory } from "@/lib/repo-layout";
import {
  alignLineScoreToSchedule,
  findHighestScoringFullInning,
  findHighestScoringHalfInning,
  parseLineScoreFromEvents,
} from "./parse-line-score";

describe("parseLineScoreFromEvents", () => {
  it("returns null when Events are missing", () => {
    expect(parseLineScoreFromEvents({})).toBeNull();
  });

  it("builds runs by inning from end-of-inning score deltas", () => {
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

  it("uses end-of-inning scores when multiple events update the same inning", () => {
    const lineScore = parseLineScoreFromEvents({
      Events: [
        { Inning: 7, "Half Inning": 0, "Away Score": 2, "Home Score": 0 },
        { Inning: 7, "Half Inning": 0, "Away Score": 6, "Home Score": 0 },
        { Inning: 7, "Half Inning": 1, "Away Score": 8, "Home Score": 0 },
        { Inning: 8, "Half Inning": 0, "Away Score": 10, "Home Score": 0 },
      ],
    });

    expect(lineScore).toEqual({
      inningNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
      awayRunsByInning: [0, 0, 0, 0, 0, 0, 8, 2],
      homeRunsByInning: [0, 0, 0, 0, 0, 0, 0, 0],
      awayTotal: 10,
      homeTotal: 0,
    });
  });

  it("matches root scores for every bundled sample game file", () => {
    const dir = gameStatisticsSamplesDirectory();
    for (const filename of readdirSync(dir).filter((name: string) =>
      name.startsWith("decoded."),
    )) {
      const data = JSON.parse(
        readFileSync(path.join(dir, filename), "utf8"),
      ) as Record<string, unknown>;
      const lineScore = parseLineScoreFromEvents(data);
      expect(lineScore).not.toBeNull();
      expect(lineScore!.awayTotal).toBe(data["Away Score"]);
      expect(lineScore!.homeTotal).toBe(data["Home Score"]);
    }
  });
});

describe("alignLineScoreToSchedule", () => {
  const lineScore = {
    inningNumbers: [1, 2],
    awayRunsByInning: [2, 1],
    homeRunsByInning: [0, 2],
    awayTotal: 3,
    homeTotal: 2,
  };

  it("returns the same line score when orientation already matches", () => {
    expect(alignLineScoreToSchedule(lineScore, 3, 2)).toEqual(lineScore);
  });

  it("swaps rows when schedule away/home totals are reversed", () => {
    expect(alignLineScoreToSchedule(lineScore, 2, 3)).toEqual({
      inningNumbers: [1, 2],
      awayRunsByInning: [0, 2],
      homeRunsByInning: [2, 1],
      awayTotal: 2,
      homeTotal: 3,
    });
  });
});
