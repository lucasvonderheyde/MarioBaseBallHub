"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { characterTierBallots } from "@/db/schema";
import {
  isCharacterTier,
  parseTierBallot,
  serializeTierBallot,
  type CharacterTier,
} from "@/domain/tier-list/tiers";
import { requireUser } from "@/lib/auth";

export async function saveTierBallotAction(input: {
  tiers: Record<string, string>;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const normalized: Record<string, CharacterTier> = {};

  for (const [charId, tier] of Object.entries(input.tiers)) {
    if (!isCharacterTier(tier)) {
      return { error: `Invalid tier for ${charId}.` };
    }
    normalized[charId] = tier;
  }

  if (Object.keys(normalized).length === 0) {
    return { error: "Assign at least one character to a tier." };
  }

  await db
    .insert(characterTierBallots)
    .values({
      userId: user.id,
      tiersJson: serializeTierBallot(normalized),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: characterTierBallots.userId,
      set: {
        tiersJson: serializeTierBallot(normalized),
        updatedAt: new Date(),
      },
    });

  revalidatePath("/tier-list");
  return {};
}

export async function getUserTierBallot(userId: string) {
  const [row] = await db
    .select()
    .from(characterTierBallots)
    .where(eq(characterTierBallots.userId, userId))
    .limit(1);
  if (!row) return {};
  return parseTierBallot(row.tiersJson);
}

export async function getAllTierBallots() {
  const rows = await db.select().from(characterTierBallots);
  return rows.map((row) => parseTierBallot(row.tiersJson));
}
