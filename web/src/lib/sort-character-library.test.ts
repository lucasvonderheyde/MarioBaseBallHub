import { describe, expect, it } from "vitest";
import type { BattingLine } from "@/lib/game-stats-queries";
import type { LeagueCharacterEntry } from "@/lib/league-characters";
import { sortCharacterLibrary } from "./sort-character-library";

function entry(gameCharId: string, displayName: string): LeagueCharacterEntry {
  return {
    gameCharId,
    displayName,
    mugshotFile: null,
    leagueCopies: 1,
    active: true,
  };
}

function battingLine(
  charId: string,
  overrides: Partial<BattingLine> = {},
): BattingLine {
  return {
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
    longestHrDistance: null,
    ...overrides,
  };
}

describe("sortCharacterLibrary", () => {
  const characters = [
    entry("Mario", "Mario"),
    entry("Luigi", "Luigi"),
    entry("Peach", "Peach"),
  ];
  const batting = new Map<string, BattingLine>([
    ["Mario", battingLine("Mario", { hr: 5, rbi: 12, obp: 0.4 })],
    ["Luigi", battingLine("Luigi", { hr: 10, rbi: 8, obp: 0.35 })],
    ["Peach", battingLine("Peach", { hr: 2, rbi: 20, obp: 0.45 })],
  ]);

  it("sorts by name ascending", () => {
    const sorted = sortCharacterLibrary(characters, batting, "name");
    expect(sorted.map((c) => c.gameCharId)).toEqual(["Luigi", "Mario", "Peach"]);
  });

  it("sorts by HR descending", () => {
    const sorted = sortCharacterLibrary(characters, batting, "hr");
    expect(sorted.map((c) => c.gameCharId)).toEqual(["Luigi", "Mario", "Peach"]);
  });

  it("sorts by RBI descending", () => {
    const sorted = sortCharacterLibrary(characters, batting, "rbi");
    expect(sorted.map((c) => c.gameCharId)).toEqual(["Peach", "Mario", "Luigi"]);
  });

  it("sorts by OBP descending", () => {
    const sorted = sortCharacterLibrary(characters, batting, "obp");
    expect(sorted.map((c) => c.gameCharId)).toEqual(["Peach", "Mario", "Luigi"]);
  });
});
