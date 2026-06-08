import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { gameStatisticsSamplesDirectory } from "@/lib/repo-layout";
import {
  isCompletedPlateAppearance,
  parseCharacterGameStats,
} from "./parse-character-game-stats";

describe("parse-character-game-stats", () => {
  const sampleFiles = fs
    .readdirSync(gameStatisticsSamplesDirectory())
    .filter((f) => f.startsWith("decoded.") && f.endsWith(".json"));

  for (const file of sampleFiles) {
    it(`parses all roster entries from ${file}`, () => {
      const json = fs.readFileSync(
        path.join(gameStatisticsSamplesDirectory(), file),
        "utf8",
      );
      const data = JSON.parse(json) as unknown;
      const parsed = parseCharacterGameStats(data);
      expect(parsed.characterStats).toHaveLength(18);
      expect(parsed.stadiumId).toBeTruthy();
      for (const row of parsed.characterStats) {
        expect(row.charId.length).toBeGreaterThan(0);
        expect(row.rosterSlot).toBeGreaterThanOrEqual(0);
        expect(row.rosterSlot).toBeLessThanOrEqual(8);
      }
    });
  }

  it("isCompletedPlateAppearance excludes None only", () => {
    expect(isCompletedPlateAppearance("None")).toBe(false);
    expect(isCompletedPlateAppearance("Single")).toBe(true);
    expect(isCompletedPlateAppearance("Caught line-drive")).toBe(true);
    expect(isCompletedPlateAppearance("HR")).toBe(true);
    expect(isCompletedPlateAppearance("Walk (BB)")).toBe(true);
  });
});
