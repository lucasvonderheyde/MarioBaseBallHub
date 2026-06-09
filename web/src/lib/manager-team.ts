import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";

export async function getManagedTeamInSeason(
  managerUserId: string,
  seasonId: string,
): Promise<{ id: string; name: string } | null> {
  const [team] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(and(eq(teams.seasonId, seasonId), eq(teams.managerUserId, managerUserId)))
    .limit(1);
  return team ?? null;
}
