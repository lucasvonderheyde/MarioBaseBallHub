import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leagueMembers, leagues, seasons } from "@/db/schema";
import {
  pickDefaultSeasonId,
  sortSeasonsForDisplay,
} from "@/lib/league-season-sort";

/** Default landing path after login/register when no ?next= is provided. */
export async function resolvePostAuthRedirect(userId: string): Promise<string> {
  const memberRows = await db
    .select({ leagueId: leagueMembers.leagueId })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId));

  if (memberRows.length !== 1) {
    return "/leagues";
  }

  const leagueId = memberRows[0]!.leagueId;
  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const activeSeasonId = pickDefaultSeasonId(sortSeasonsForDisplay(seasonRows));
  if (activeSeasonId) {
    return `/leagues/${leagueId}/seasons/${activeSeasonId}`;
  }
  return `/leagues/${leagueId}`;
}
