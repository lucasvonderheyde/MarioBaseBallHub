"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { characterTierBallots } from "@/db/schema";
import {
  ballotToAssignmentMap,
  parseOrderedTierBallot,
  parseTierBallot,
  serializeOrderedTierBallot,
  TIER_OPTIONS,
  type CharacterTier,
  type OrderedTierBallot,
} from "@/domain/tier-list/tiers";
import { requireUser } from "@/lib/auth";

function normalizeBallot(ballot: OrderedTierBallot): OrderedTierBallot {
  const normalized: OrderedTierBallot = {};
  const seen = new Set<string>();

  for (const tier of TIER_OPTIONS) {
    const ids: string[] = [];
    for (const charId of ballot[tier] ?? []) {
      if (seen.has(charId)) continue;
      seen.add(charId);
      ids.push(charId);
    }
    if (ids.length > 0) normalized[tier] = ids;
  }

  return normalized;
}

export async function saveTierBallotAction(input: {
  ballot: OrderedTierBallot;
}): Promise<{ error?: string; ballot?: OrderedTierBallot }> {
  const user = await requireUser();
  const normalized = normalizeBallot(input.ballot);
  const assignments = ballotToAssignmentMap(normalized);

  if (Object.keys(assignments).length === 0) {
    return { error: "Assign at least one character to a tier." };
  }

  for (const tier of Object.values(assignments)) {
    if (!TIER_OPTIONS.includes(tier)) {
      return { error: "Invalid tier assignment." };
    }
  }

  const tiersJson = serializeOrderedTierBallot(normalized);

  await db
    .insert(characterTierBallots)
    .values({
      userId: user.id,
      tiersJson,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: characterTierBallots.userId,
      set: {
        tiersJson,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/tier-list");
  return { ballot: normalized };
}

export async function getUserTierBallot(userId: string): Promise<OrderedTierBallot> {
  const [row] = await db
    .select()
    .from(characterTierBallots)
    .where(eq(characterTierBallots.userId, userId))
    .limit(1);
  if (!row) return {};
  return parseOrderedTierBallot(row.tiersJson);
}

export async function getAllTierBallots(): Promise<Record<string, CharacterTier>[]> {
  const rows = await db.select().from(characterTierBallots);
  return rows.map((row) => parseTierBallot(row.tiersJson));
}
