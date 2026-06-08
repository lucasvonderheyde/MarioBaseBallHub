import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { leagues, seasons, teams } from "@/db/schema";
import type { AppUser } from "@/lib/auth";

export type ClaimableTeam = {
  team: typeof teams.$inferSelect;
  season: typeof seasons.$inferSelect;
};

function usernameMatches(reserved: string | null, username: string): boolean {
  if (!reserved) return true;
  return reserved.trim().toLowerCase() === username.trim().toLowerCase();
}

export async function userManagesTeamInSeason(
  userId: string,
  seasonId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.seasonId, seasonId), eq(teams.managerUserId, userId)))
    .limit(1);
  return Boolean(row);
}

export function canUserClaimTeam(
  team: typeof teams.$inferSelect,
  user: Pick<AppUser, "id" | "username">,
  alreadyManagesInSeason: boolean,
): boolean {
  if (team.managerUserId) return false;
  if (alreadyManagesInSeason) return false;
  if (!usernameMatches(team.claimUsername, user.username)) return false;
  return true;
}

/** Unassigned teams in a league the user may claim. */
export async function getClaimableTeamsForLeague(
  leagueId: string,
  user: Pick<AppUser, "id" | "username">,
): Promise<ClaimableTeam[]> {
  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const out: ClaimableTeam[] = [];
  for (const season of seasonRows) {
    const alreadyManages = await userManagesTeamInSeason(user.id, season.id);
    const unassigned = await db
      .select()
      .from(teams)
      .where(and(eq(teams.seasonId, season.id), isNull(teams.managerUserId)));

    for (const team of unassigned) {
      if (canUserClaimTeam(team, user, alreadyManages)) {
        out.push({ team, season });
      }
    }
  }
  return out;
}

/** Leagues where the user has at least one claimable team. */
export async function getLeaguesWithClaimableTeams(
  user: Pick<AppUser, "id" | "username">,
): Promise<{ league: typeof leagues.$inferSelect; count: number }[]> {
  const allLeagues = await db.select().from(leagues);
  const results: { league: typeof leagues.$inferSelect; count: number }[] = [];
  for (const league of allLeagues) {
    const claimable = await getClaimableTeamsForLeague(league.id, user);
    if (claimable.length > 0) {
      results.push({ league, count: claimable.length });
    }
  }
  return results;
}

export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  return true;
}
