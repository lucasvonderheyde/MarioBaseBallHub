import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leagues, seasons, teams } from "@/db/schema";
import { sortSeasonsForDisplay } from "@/lib/league-season-sort";
import type { LeagueSeasonNavOption } from "@/components/LeagueSeasonSwitcher";

export type CurrentSeasonNav = {
  href: string;
  label: string;
};

/** Best season hub link for a manager: active season first, then newest. */
export async function getUserCurrentSeasonNav(
  userId: string,
): Promise<CurrentSeasonNav | null> {
  const options = await getUserLeagueSeasonNavOptions(userId);
  if (options.length === 0) return null;
  return { href: options[0]!.href, label: options[0]!.label };
}

/** One entry per managed team/season, sorted by active season first. */
export async function getUserLeagueSeasonNavOptions(
  userId: string,
): Promise<LeagueSeasonNavOption[]> {
  const rows = await db
    .select({
      seasonId: teams.seasonId,
      seasonName: seasons.name,
      seasonStatus: seasons.status,
      leagueId: seasons.leagueId,
      leagueName: leagues.name,
      createdAt: seasons.createdAt,
    })
    .from(teams)
    .innerJoin(seasons, eq(teams.seasonId, seasons.id))
    .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
    .where(eq(teams.managerUserId, userId));

  if (rows.length === 0) return [];

  const byLeague = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byLeague.get(row.leagueId) ?? [];
    list.push(row);
    byLeague.set(row.leagueId, list);
  }

  const options: LeagueSeasonNavOption[] = [];

  for (const leagueRows of byLeague.values()) {
    const sorted = sortSeasonsForDisplay(
      leagueRows.map((row) => ({
        id: row.seasonId,
        status: row.seasonStatus,
        createdAt: row.createdAt,
      })),
    );
    const pick = sorted[0]!;
    const match = leagueRows.find((row) => row.seasonId === pick.id);
    if (!match) continue;

    options.push({
      href: `/leagues/${match.leagueId}/seasons/${match.seasonId}`,
      label: match.seasonStatus === "active" ? "Current season" : match.seasonName,
      leagueName: match.leagueName,
    });
  }

  options.sort((a, b) => a.leagueName.localeCompare(b.leagueName));
  return options;
}
