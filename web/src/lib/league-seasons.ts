import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import {
  pickDefaultSeasonId,
  sortSeasonsForDisplay,
} from "@/lib/league-season-sort";

export { pickDefaultSeasonId, sortSeasonsForDisplay } from "@/lib/league-season-sort";
export type { SeasonStatus } from "@/lib/league-season-sort";

export async function getLeagueSeasons(leagueId: string) {
  const rows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId))
    .orderBy(asc(seasons.createdAt));
  return sortSeasonsForDisplay(rows);
}

export async function getLeagueScheduleData(leagueId: string) {
  const sortedSeasons = await getLeagueSeasons(leagueId);
  const seasonData = await Promise.all(
    sortedSeasons.map(async (season) => {
      const dash = await getSeasonDashboard(season.id);
      if (!dash) return null;
      return { season, dash };
    }),
  );
  return seasonData.filter((s): s is NonNullable<typeof s> => s != null);
}

export async function getLeaguePlayoffData(leagueId: string, seasonId: string) {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) return null;
  return dash;
}
