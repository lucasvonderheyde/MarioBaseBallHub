import { describe, expect, it } from "vitest";
import type { BattingLine, PitchingLine } from "@/lib/game-stats-queries";
import type {
  ManagerCharacterBatting,
  ManagerCharacterPitching,
} from "@/lib/manager-stats";
import {
  sortManagerCharacterBatting,
  sortManagerCharacterPitching,
} from "./sort-manager-character-stats";

function batting(
  charId: string,
  overrides: Partial<BattingLine> = {},
): ManagerCharacterBatting {
  return {
    charId,
    line: {
      charId,
      charOccurrenceIndex: 0,
      games: 0,
      ab: 0,
      hits: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      walks4ball: 0,
      walksHbp: 0,
      sacFly: 0,
      rbi: 0,
      ba: null,
      obp: null,
      slg: null,
      ...overrides,
    },
  };
}

function pitching(
  charId: string,
  overrides: Partial<PitchingLine> = {},
): ManagerCharacterPitching {
  return {
    charId,
    line: {
      charId,
      charOccurrenceIndex: 0,
      games: 0,
      outsPitched: 0,
      battersFaced: 0,
      hitsAllowed: 0,
      runsAllowed: 0,
      earnedRuns: 0,
      walks: 0,
      strikeouts: 0,
      hrAllowed: 0,
      pitchesThrown: 0,
      ...overrides,
    },
  };
}

describe("sortManagerCharacterBatting", () => {
  const rows = [
    batting("Mario", { ab: 40, hr: 5, obp: 0.4 }),
    batting("Luigi", { ab: 60, hr: 10, obp: 0.35 }),
    batting("Peach", { ab: 20, hr: 2, obp: 0.45 }),
  ];

  it("sorts by plate appearances by default", () => {
    const sorted = sortManagerCharacterBatting(rows, "ab");
    expect(sorted.map((row) => row.charId)).toEqual(["Luigi", "Mario", "Peach"]);
  });

  it("sorts by HR descending", () => {
    const sorted = sortManagerCharacterBatting(rows, "hr");
    expect(sorted.map((row) => row.charId)).toEqual(["Luigi", "Mario", "Peach"]);
  });
});

describe("sortManagerCharacterPitching", () => {
  const rows = [
    pitching("Mario", { outsPitched: 18, strikeouts: 12 }),
    pitching("Luigi", { outsPitched: 27, strikeouts: 20 }),
    pitching("Peach", { outsPitched: 9, strikeouts: 5 }),
  ];

  it("sorts by innings pitched", () => {
    const sorted = sortManagerCharacterPitching(rows, "ip");
    expect(sorted.map((row) => row.charId)).toEqual(["Luigi", "Mario", "Peach"]);
  });

  it("sorts by strikeouts", () => {
    const sorted = sortManagerCharacterPitching(rows, "k");
    expect(sorted.map((row) => row.charId)).toEqual(["Luigi", "Mario", "Peach"]);
  });
});
