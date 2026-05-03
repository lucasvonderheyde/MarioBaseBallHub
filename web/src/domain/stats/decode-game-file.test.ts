import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { gameStatisticsSamplesDirectory } from "@/lib/repo-layout";
import { normalizeStatsGameId, parseDecodedGameFile } from "./decode-game-file";

describe("decode-game-file", () => {
  it("normalizes GameID commas", () => {
    expect(normalizeStatsGameId("1,876,412,123")).toBe("1876412123");
  });

  it("parses a real decoded sample from data/game-statistics", () => {
    const file = path.join(
      gameStatisticsSamplesDirectory(),
      "decoded.20260503T044408_Zomsoth-Vs-jimmydubs99_1876412123.json",
    );
    const json = fs.readFileSync(file, "utf8");
    const d = parseDecodedGameFile(json);
    expect(d.statsGameId).toBe("1876412123");
    expect(d.awayPlayer).toBe("Zomsoth");
    expect(d.homePlayer).toBe("jimmydubs99");
    expect(d.awayScore).toBe(12);
    expect(d.homeScore).toBe(2);
  });
});
