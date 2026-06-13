import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  homerunDistanceFromLanding,
  parseHomerunDistancesByRoster,
} from "./parse-homerun-distance";

describe("parse-homerun-distance", () => {
  it("computes landing distance from X/Z", () => {
    expect(homerunDistanceFromLanding(3, 4)).toBe(5);
  });

  it("finds longest HR per roster slot from sample JSON", () => {
    const samplePath = path.join(
      process.cwd(),
      "..",
      "data",
      "game-statistics",
      "decoded.20260510T034506_Zomsoth-Vs-zakhary66_838409374.json",
    );
    if (!fs.existsSync(samplePath)) return;

    const data = JSON.parse(fs.readFileSync(samplePath, "utf8"));
    const distances = parseHomerunDistancesByRoster(data);
    expect(distances.size).toBeGreaterThan(0);
    const longest = Math.max(...distances.values());
    expect(longest).toBeGreaterThan(70);
  });
});
