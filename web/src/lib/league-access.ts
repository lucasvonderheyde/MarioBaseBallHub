import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leagueMembers, leagues, seasons } from "@/db/schema";
import { type AppUser, userIsSiteAdmin } from "@/lib/auth";

export type LeagueRole = "admin" | "manager";

export type LeagueAccessUser = Pick<AppUser, "id" | "isSiteAdmin">;

export function isLeagueAdmin(role: LeagueRole | null): boolean {
  return role === "admin";
}

export async function getLeagueRole(
  leagueId: string,
  user: LeagueAccessUser | null,
): Promise<LeagueRole | null> {
  if (!user) return null;
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

/** Anyone may view league hub, schedule, and playoffs without logging in. */
export async function leagueExists(leagueId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  return row != null;
}

export async function canAccessLeague(
  leagueId: string,
  user: LeagueAccessUser,
): Promise<boolean> {
  if (!(await leagueExists(leagueId))) return false;
  if (userIsSiteAdmin(user)) return true;
  const role = await getLeagueRole(leagueId, user);
  return role !== null;
}

/** Character library, stadium library, and roster tools require league membership. */
export async function requireLeagueMember(
  leagueId: string,
  user: LeagueAccessUser,
): Promise<LeagueRole> {
  const role = await getLeagueRole(leagueId, user);
  if (!role) throw new Error("Forbidden");
  return role;
}

export async function requireLeagueAdmin(
  leagueId: string,
  user: LeagueAccessUser,
): Promise<void> {
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") throw new Error("Forbidden");
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
