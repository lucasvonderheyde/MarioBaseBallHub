import { describe, expect, it } from "vitest";
import {
  lotteryWeightsFromStandings,
  runDraftLottery,
} from "./lottery";

describe("lotteryWeightsFromStandings", () => {
  it("gives the worst team the most balls", () => {
    const entries = lotteryWeightsFromStandings(["first", "second", "last"]);
    expect(entries).toEqual([
      { teamId: "first", weight: 1 },
      { teamId: "second", weight: 2 },
      { teamId: "last", weight: 3 },
    ]);
  });
});

describe("runDraftLottery", () => {
  const entries = lotteryWeightsFromStandings(["a", "b", "c", "d"]);

  it("is deterministic for a seed and returns every team exactly once", () => {
    const order = runDraftLottery(entries, 123);
    expect(runDraftLottery(entries, 123)).toEqual(order);
    expect([...order].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("different seeds can produce different orders", () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, seed) =>
        runDraftLottery(entries, seed).join(","),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("weights bias the top pick toward worse teams", () => {
    let worstFirst = 0;
    const runs = 2000;
    for (let seed = 0; seed < runs; seed++) {
      if (runDraftLottery(entries, seed)[0] === "d") worstFirst++;
    }
    // d holds 4 of 10 balls → expect ~40% of top picks.
    expect(worstFirst / runs).toBeGreaterThan(0.3);
    expect(worstFirst / runs).toBeLessThan(0.5);
  });
});
