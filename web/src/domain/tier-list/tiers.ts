export const TIER_OPTIONS = ["S", "A", "B", "C", "D", "F"] as const;
export type CharacterTier = (typeof TIER_OPTIONS)[number];

export function isCharacterTier(value: string): value is CharacterTier {
  return (TIER_OPTIONS as readonly string[]).includes(value);
}

export function parseTierBallot(json: string): Record<string, CharacterTier> {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, CharacterTier> = {};
    for (const [charId, tier] of Object.entries(parsed)) {
      if (typeof tier === "string" && isCharacterTier(tier)) {
        out[charId] = tier;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeTierBallot(tiers: Record<string, CharacterTier>): string {
  return JSON.stringify(tiers);
}

export type TierAggregate = {
  gameCharId: string;
  counts: Record<CharacterTier, number>;
  totalVotes: number;
  consensusTier: CharacterTier | null;
};

export function aggregateTierBallots(
  ballots: Record<string, CharacterTier>[],
  charIds: string[],
): TierAggregate[] {
  return charIds.map((gameCharId) => {
    const counts: Record<CharacterTier, number> = {
      S: 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };
    let totalVotes = 0;
    for (const ballot of ballots) {
      const tier = ballot[gameCharId];
      if (!tier) continue;
      counts[tier]++;
      totalVotes++;
    }
    let consensusTier: CharacterTier | null = null;
    let best = 0;
    for (const tier of TIER_OPTIONS) {
      if (counts[tier] > best) {
        best = counts[tier];
        consensusTier = tier;
      }
    }
    return { gameCharId, counts, totalVotes, consensusTier };
  });
}
