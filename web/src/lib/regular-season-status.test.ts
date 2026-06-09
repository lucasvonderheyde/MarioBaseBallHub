import { describe, expect, it } from "vitest";
import { isRegularSeasonComplete } from "@/lib/regular-season-status";

describe("isRegularSeasonComplete", () => {
  it("returns false when no regular games exist", () => {
    expect(isRegularSeasonComplete([])).toBe(false);
  });

  it("returns false when any regular game is unplayed", () => {
    expect(
      isRegularSeasonComplete([
        {
          game: { playedAt: new Date() },
          round: { phase: "regular" },
        },
        {
          game: { playedAt: null },
          round: { phase: "regular" },
        },
      ]),
    ).toBe(false);
  });

  it("returns true when all regular games are played", () => {
    expect(
      isRegularSeasonComplete([
        {
          game: { playedAt: new Date() },
          round: { phase: "regular" },
        },
        {
          game: { playedAt: new Date() },
          round: { phase: "regular" },
        },
      ]),
    ).toBe(true);
  });

  it("ignores unplayed playoff games", () => {
    expect(
      isRegularSeasonComplete([
        {
          game: { playedAt: new Date() },
          round: { phase: "regular" },
        },
        {
          game: { playedAt: null },
          round: { phase: "playoffs" },
        },
      ]),
    ).toBe(true);
  });
});
