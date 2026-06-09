import { and, count, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { rosterInstances } from "@/db/schema";

/** Each roster_instances row counts as one player, including duplicate characters. */
export const MIN_TEAM_ROSTER_SIZE = 9;

export async function countTeamRosterInstances(teamId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(rosterInstances)
    .where(eq(rosterInstances.teamId, teamId));
  return row?.total ?? 0;
}

export async function getTeamRosterCountsForSeason(
  seasonId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      teamId: rosterInstances.teamId,
      total: count(),
    })
    .from(rosterInstances)
    .where(
      and(
        eq(rosterInstances.seasonId, seasonId),
        isNotNull(rosterInstances.teamId),
      ),
    )
    .groupBy(rosterInstances.teamId);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.teamId) map.set(row.teamId, row.total);
  }
  return map;
}

export function rosterCountMeetsMinimum(count: number): boolean {
  return count >= MIN_TEAM_ROSTER_SIZE;
}

export function rosterCountAfterRemoval(
  currentCount: number,
  removing: number,
): number {
  return currentCount - removing;
}

export function rosterCountAfterTrade(
  currentCount: number,
  losing: number,
  gaining: number,
): number {
  return currentCount - losing + gaining;
}

export function minimumRosterError(teamName?: string): string {
  const label = teamName ? `${teamName} ` : "";
  return `${label}must keep at least ${MIN_TEAM_ROSTER_SIZE} roster players (each character copy counts separately).`;
}
