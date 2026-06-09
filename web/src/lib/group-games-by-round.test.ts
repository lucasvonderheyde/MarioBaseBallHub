import { describe, expect, it } from "vitest";
import { groupGamesByRound } from "./group-games-by-round";

describe("groupGamesByRound", () => {
  it("groups entries by round id", () => {
    const games = [
      { round: { id: "r1" }, game: { id: "g1" } },
      { round: { id: "r2" }, game: { id: "g2" } },
      { round: { id: "r1" }, game: { id: "g3" } },
    ];
    const grouped = groupGamesByRound(games);
    expect(grouped.get("r1")).toHaveLength(2);
    expect(grouped.get("r2")).toHaveLength(1);
  });
});
