import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { rounds, scheduleGames } from "@/db/schema";

/** True once any game in the season has uploaded stats (season is underway). */
export async function seasonHasReportedGames(seasonId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: scheduleGames.id })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .where(
      and(eq(rounds.seasonId, seasonId), isNotNull(scheduleGames.statsRawJson)),
    )
    .limit(1);
  return row != null;
}
