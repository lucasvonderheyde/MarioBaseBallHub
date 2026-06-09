import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  characterGameStats,
  managerPersonalGames,
  teams,
} from "@/db/schema";

/** Distinct uploaded games for a manager (league schedule + personal batch). */
export async function countManagerUploadedGames(
  managerUserId: string,
): Promise<number> {
  const [leagueRow] = await db
    .select({
      count: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
    })
    .from(characterGameStats)
    .innerJoin(teams, eq(characterGameStats.teamId, teams.id))
    .where(eq(teams.managerUserId, managerUserId));

  const [personalRow] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(managerPersonalGames)
    .where(eq(managerPersonalGames.managerUserId, managerUserId));

  return (leagueRow?.count ?? 0) + (personalRow?.count ?? 0);
}
