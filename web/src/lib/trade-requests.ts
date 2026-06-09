import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, rosterInstances, tradeRequests } from "@/db/schema";
import type {
  TradeRequestDisplay,
  TradeRosterInstance,
} from "@/lib/trade-request-display";

export type { TradeRequestDisplay, TradeRosterInstance } from "@/lib/trade-request-display";

export function parseTradeInstanceIds(json: string): string[] {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) {
    throw new Error("Invalid trade instance payload.");
  }
  return parsed;
}

export async function getPendingTradeRequestsForSeason(
  seasonId: string,
): Promise<TradeRequestDisplay[]> {
  const rows = await db
    .select()
    .from(tradeRequests)
    .where(
      and(
        eq(tradeRequests.seasonId, seasonId),
        eq(tradeRequests.status, "pending"),
      ),
    )
    .orderBy(desc(tradeRequests.createdAt));

  return rows.map((row) => ({
    id: row.id,
    fromTeamId: row.fromTeamId,
    toTeamId: row.toTeamId,
    proposedByUserId: row.proposedByUserId,
    status: row.status,
    offeredInstanceIds: parseTradeInstanceIds(row.offeredInstanceIds),
    requestedInstanceIds: parseTradeInstanceIds(row.requestedInstanceIds),
    message: row.message,
    createdAt: row.createdAt,
  }));
}

export async function getTradeRosterInstancesForSeason(
  seasonId: string,
): Promise<TradeRosterInstance[]> {
  const rows = await db
    .select({
      id: rosterInstances.id,
      teamId: rosterInstances.teamId,
      copyIndex: rosterInstances.copyIndex,
      characterId: rosterInstances.characterId,
      displayName: characters.displayName,
    })
    .from(rosterInstances)
    .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
    .where(eq(rosterInstances.seasonId, seasonId));

  return rows;
}
