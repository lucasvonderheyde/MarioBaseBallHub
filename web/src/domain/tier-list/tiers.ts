export const TIER_OPTIONS = ["S", "A", "B", "C", "D", "F"] as const;
export type CharacterTier = (typeof TIER_OPTIONS)[number];

export function isCharacterTier(value: string): value is CharacterTier {
  return (TIER_OPTIONS as readonly string[]).includes(value);
}

export type OrderedTierBallot = Partial<Record<CharacterTier, string[]>>;

type TierBallotV2 = {
  version: 2;
  tiers: OrderedTierBallot;
};

function emptyOrderedBallot(): OrderedTierBallot {
  return {};
}

export function ballotToAssignmentMap(
  ballot: OrderedTierBallot,
): Record<string, CharacterTier> {
  const out: Record<string, CharacterTier> = {};
  for (const tier of TIER_OPTIONS) {
    for (const charId of ballot[tier] ?? []) {
      out[charId] = tier;
    }
  }
  return out;
}

export function parseOrderedTierBallot(json: string): OrderedTierBallot {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return emptyOrderedBallot();
    }

    if (
      "version" in parsed &&
      (parsed as TierBallotV2).version === 2 &&
      "tiers" in parsed
    ) {
      const tiers = (parsed as TierBallotV2).tiers;
      if (!tiers || typeof tiers !== "object") return emptyOrderedBallot();
      const out: OrderedTierBallot = {};
      for (const tier of TIER_OPTIONS) {
        const ids = tiers[tier];
        if (Array.isArray(ids)) {
          out[tier] = ids.filter((id): id is string => typeof id === "string");
        }
      }
      return out;
    }

    const entries = Object.entries(parsed as Record<string, unknown>);
    if (entries.length === 0) return emptyOrderedBallot();

    const firstValue = entries[0]?.[1];
    if (typeof firstValue === "string" && isCharacterTier(firstValue)) {
      const byTier: OrderedTierBallot = {};
      for (const tier of TIER_OPTIONS) byTier[tier] = [];
      for (const [charId, tier] of entries) {
        if (typeof tier === "string" && isCharacterTier(tier)) {
          byTier[tier]!.push(charId);
        }
      }
      for (const tier of TIER_OPTIONS) {
        byTier[tier]!.sort((a, b) => a.localeCompare(b));
      }
      return byTier;
    }

    const hasTierArrays = TIER_OPTIONS.some((tier) =>
      Array.isArray((parsed as Record<string, unknown>)[tier]),
    );
    if (hasTierArrays) {
      const out: OrderedTierBallot = {};
      for (const tier of TIER_OPTIONS) {
        const ids = (parsed as Record<string, unknown>)[tier];
        if (Array.isArray(ids)) {
          out[tier] = ids.filter((id): id is string => typeof id === "string");
        }
      }
      return out;
    }
  } catch {
    return emptyOrderedBallot();
  }
  return emptyOrderedBallot();
}

export function parseTierBallot(json: string): Record<string, CharacterTier> {
  return ballotToAssignmentMap(parseOrderedTierBallot(json));
}

export function serializeOrderedTierBallot(ballot: OrderedTierBallot): string {
  const tiers: OrderedTierBallot = {};
  for (const tier of TIER_OPTIONS) {
    if (ballot[tier]?.length) {
      tiers[tier] = ballot[tier];
    }
  }
  return JSON.stringify({ version: 2, tiers } satisfies TierBallotV2);
}

export function serializeTierBallot(tiers: Record<string, CharacterTier>): string {
  const ordered: OrderedTierBallot = {};
  for (const tier of TIER_OPTIONS) ordered[tier] = [];
  for (const [charId, tier] of Object.entries(tiers)) {
    if (!isCharacterTier(tier)) continue;
    ordered[tier]!.push(charId);
  }
  for (const tier of TIER_OPTIONS) {
    ordered[tier]!.sort((a, b) => a.localeCompare(b));
  }
  return serializeOrderedTierBallot(ordered);
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
