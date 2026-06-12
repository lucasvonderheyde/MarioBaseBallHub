import {
  TIER_OPTIONS,
  type CharacterTier,
  type OrderedTierBallot,
} from "@/domain/tier-list/tiers";

export type TierBoardState = {
  tierOrder: OrderedTierBallot;
  unranked: string[];
};

export type TierDropTarget =
  | { kind: "tier"; tier: CharacterTier; index: number }
  | { kind: "pool"; index: number };

/**
 * Moves a character to the target list position. The character is removed
 * by value from every list first, so the result always contains exactly one
 * copy regardless of stale drag indices or duplicated input state.
 */
export function moveCharacterInBoard(
  state: TierBoardState,
  charId: string,
  to: TierDropTarget,
): TierBoardState {
  const nextTierOrder: OrderedTierBallot = {};
  for (const tier of TIER_OPTIONS) {
    nextTierOrder[tier] = [...(state.tierOrder[tier] ?? [])];
  }
  const nextUnranked = [...state.unranked];

  let removedFromTargetIndex = -1;

  function removeEverywhere(list: string[], isTargetList: boolean) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] !== charId) continue;
      list.splice(i, 1);
      if (isTargetList) removedFromTargetIndex = i;
    }
  }

  for (const tier of TIER_OPTIONS) {
    removeEverywhere(
      nextTierOrder[tier]!,
      to.kind === "tier" && to.tier === tier,
    );
  }
  removeEverywhere(nextUnranked, to.kind === "pool");

  const targetList =
    to.kind === "tier" ? nextTierOrder[to.tier]! : nextUnranked;
  let insertIndex = Math.min(to.index, targetList.length);
  if (removedFromTargetIndex !== -1 && removedFromTargetIndex < insertIndex) {
    insertIndex -= 1;
  }
  targetList.splice(insertIndex, 0, charId);

  return { tierOrder: nextTierOrder, unranked: nextUnranked };
}
