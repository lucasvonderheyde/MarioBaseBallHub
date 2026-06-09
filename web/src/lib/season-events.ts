import crypto from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { seasonEvents } from "@/db/schema";

export async function recordSeasonEvent(input: {
  seasonId: string;
  eventType: string;
  message: string;
  relatedGameId?: string;
}): Promise<void> {
  await db.insert(seasonEvents).values({
    id: crypto.randomUUID(),
    seasonId: input.seasonId,
    eventType: input.eventType,
    message: input.message,
    relatedGameId: input.relatedGameId ?? null,
    createdAt: new Date(),
  });
}

export async function getRecentSeasonEvents(seasonId: string, limit = 20) {
  return db
    .select()
    .from(seasonEvents)
    .where(eq(seasonEvents.seasonId, seasonId))
    .orderBy(desc(seasonEvents.createdAt))
    .limit(limit);
}
