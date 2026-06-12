import { describe, expect, it } from "vitest";
import {
  moveCharacterInBoard,
  type TierBoardState,
} from "./move-character";
import { TIER_OPTIONS } from "./tiers";

function allCharIds(state: TierBoardState): string[] {
  return [
    ...TIER_OPTIONS.flatMap((tier) => state.tierOrder[tier] ?? []),
    ...state.unranked,
  ];
}

const base: TierBoardState = {
  tierOrder: {
    S: ["mario", "luigi", "peach"],
    A: ["yoshi"],
  },
  unranked: ["wario", "waluigi", "daisy"],
};

describe("moveCharacterInBoard", () => {
  it("reorders forward within a tier without duplicating", () => {
    const next = moveCharacterInBoard(base, "mario", {
      kind: "tier",
      tier: "S",
      index: 2,
    });
    expect(next.tierOrder.S).toEqual(["luigi", "mario", "peach"]);
    expect(allCharIds(next).sort()).toEqual(allCharIds(base).sort());
  });

  it("reorders backward within a tier", () => {
    const next = moveCharacterInBoard(base, "peach", {
      kind: "tier",
      tier: "S",
      index: 0,
    });
    expect(next.tierOrder.S).toEqual(["peach", "mario", "luigi"]);
  });

  it("moves across tiers at the given index", () => {
    const next = moveCharacterInBoard(base, "mario", {
      kind: "tier",
      tier: "A",
      index: 1,
    });
    expect(next.tierOrder.S).toEqual(["luigi", "peach"]);
    expect(next.tierOrder.A).toEqual(["yoshi", "mario"]);
  });

  it("moves from the pool into a tier", () => {
    const next = moveCharacterInBoard(base, "wario", {
      kind: "tier",
      tier: "S",
      index: 0,
    });
    expect(next.tierOrder.S).toEqual(["wario", "mario", "luigi", "peach"]);
    expect(next.unranked).toEqual(["waluigi", "daisy"]);
  });

  it("moves from a tier back to the pool", () => {
    const next = moveCharacterInBoard(base, "yoshi", { kind: "pool", index: 3 });
    expect(next.tierOrder.A).toEqual([]);
    expect(next.unranked).toEqual(["wario", "waluigi", "daisy", "yoshi"]);
  });

  it("reorders forward within the pool without off-by-one", () => {
    const next = moveCharacterInBoard(base, "wario", { kind: "pool", index: 2 });
    expect(next.unranked).toEqual(["waluigi", "wario", "daisy"]);
  });

  it("keeps exactly one copy when applied twice with a stale source (bubbled drop)", () => {
    const once = moveCharacterInBoard(base, "mario", {
      kind: "tier",
      tier: "A",
      index: 0,
    });
    const twice = moveCharacterInBoard(once, "mario", {
      kind: "tier",
      tier: "A",
      index: once.tierOrder.A!.length,
    });
    expect(allCharIds(twice).filter((id) => id === "mario")).toHaveLength(1);
    expect(allCharIds(twice).sort()).toEqual(allCharIds(base).sort());
  });

  it("collapses pre-existing duplicates of the moved character", () => {
    const corrupted: TierBoardState = {
      tierOrder: { S: ["mario", "luigi", "mario"], A: ["mario"] },
      unranked: [],
    };
    const next = moveCharacterInBoard(corrupted, "mario", {
      kind: "tier",
      tier: "S",
      index: 0,
    });
    expect(next.tierOrder.S).toEqual(["mario", "luigi"]);
    expect(next.tierOrder.A).toEqual([]);
  });

  it("clamps an out-of-range target index to the list end", () => {
    const next = moveCharacterInBoard(base, "wario", {
      kind: "tier",
      tier: "A",
      index: 99,
    });
    expect(next.tierOrder.A).toEqual(["yoshi", "wario"]);
  });

  it("does not mutate the input state", () => {
    moveCharacterInBoard(base, "mario", { kind: "pool", index: 0 });
    expect(base.tierOrder.S).toEqual(["mario", "luigi", "peach"]);
    expect(base.unranked).toEqual(["wario", "waluigi", "daisy"]);
  });
});
