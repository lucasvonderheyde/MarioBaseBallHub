import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leagueMembers, seasons } from "@/db/schema";
import { type AppUser, userIsSiteAdmin } from "@/lib/auth";

export type LeagueAccessUser = Pick<AppUser, "id" | "isSiteAdmin">;

export async function getLeagueRole(
  leagueId: string,
  user: LeagueAccessUser,
): Promise<"admin" | "manager" | null> {
  if (userIsSiteAdmin(user)) return "admin";

  const [row] = await db
    .select({ role: leagueMembers.role })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, leagueId),
        eq(leagueMembers.userId, user.id),
      ),
    )
    .limit(1);
  return row?.role ?? null;
}

export async function canAccessLeague(
  leagueId: string,
  user: LeagueAccessUser,
): Promise<boolean> {
  if (userIsSiteAdmin(user)) return true;
  const role = await getLeagueRole(leagueId, user);
  return role !== null;
}

export async function getSeasonLeagueId(seasonId: string) {
  const [s] = await db
    .select({ leagueId: seasons.leagueId })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  return s?.leagueId ?? null;
}

export async function requireSeasonAdmin(
  seasonId: string,
  user: LeagueAccessUser,
) {
  const leagueId = await getSeasonLeagueId(seasonId);
  if (!leagueId) throw new Error("Season not found");
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") throw new Error("Forbidden");
  return leagueId;
}
