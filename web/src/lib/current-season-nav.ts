import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons, teams } from "@/db/schema";
import { sortSeasonsForDisplay } from "@/lib/league-season-sort";

export type CurrentSeasonNav = {
  href: string;
  label: string;
};

/** Best season hub link for a manager: active season first, then newest. */
export async function getUserCurrentSeasonNav(
  userId: string,
): Promise<CurrentSeasonNav | null> {
  const rows = await db
    .select({
      seasonId: teams.seasonId,
      seasonName: seasons.name,
      leagueId: seasons.leagueId,
      status: seasons.status,
      createdAt: seasons.createdAt,
    })
    .from(teams)
    .innerJoin(seasons, eq(teams.seasonId, seasons.id))
    .where(eq(teams.managerUserId, userId));

  if (rows.length === 0) return null;

  const sorted = sortSeasonsForDisplay(
    rows.map((row) => ({
      id: row.seasonId,
      status: row.status,
      createdAt: row.createdAt,
    })),
  );

  const pick = sorted[0]!;
  const match = rows.find((row) => row.seasonId === pick.id);
  if (!match) return null;

  return {
    href: `/leagues/${match.leagueId}/seasons/${match.seasonId}`,
    label: match.status === "active" ? "Current season" : match.seasonName,
  };
}
