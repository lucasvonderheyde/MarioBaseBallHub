import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leagueMembers, seasons } from "@/db/schema";

export async function getLeagueRole(
  leagueId: string,
  userId: string,
): Promise<"admin" | "manager" | null> {
  const [row] = await db
    .select({ role: leagueMembers.role })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, leagueId),
        eq(leagueMembers.userId, userId),
      ),
    )
    .limit(1);
  return row?.role ?? null;
}

export async function getSeasonLeagueId(seasonId: string) {
  const [s] = await db
    .select({ leagueId: seasons.leagueId })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  return s?.leagueId ?? null;
}

export async function requireSeasonAdmin(seasonId: string, userId: string) {
  const leagueId = await getSeasonLeagueId(seasonId);
  if (!leagueId) throw new Error("Season not found");
  const role = await getLeagueRole(leagueId, userId);
  if (role !== "admin") throw new Error("Forbidden");
  return leagueId;
}
