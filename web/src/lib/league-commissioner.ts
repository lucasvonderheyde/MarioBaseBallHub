import { and, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  leagueMembers,
  rounds,
  scheduleGames,
  seasons,
  users,
} from "@/db/schema";
import {
  pickDefaultSeasonId,
  sortSeasonsForDisplay,
} from "@/lib/league-season-sort";

export type CommissionerMember = {
  userId: string;
  username: string;
  displayName: string | null;
  role: "admin" | "manager";
  userCreatedAt: Date;
};

export type CommissionerSeasonRow = {
  id: string;
  name: string;
  status: "setup" | "active" | "completed";
  gameCount: number;
};

export type CommissionerOverview = {
  managerCount: number;
  activeSeason: { id: string; name: string; status: string } | null;
  lastGameUploadedAt: Date | null;
};

export async function getCommissionerOverview(
  leagueId: string,
): Promise<CommissionerOverview> {
  const [managerRow] = await db
    .select({ n: count() })
    .from(leagueMembers)
    .where(
      and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.role, "manager")),
    );

  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));
  const sorted = sortSeasonsForDisplay(seasonRows);
  const activeSeasonId = pickDefaultSeasonId(sorted);
  const activeSeason = activeSeasonId
    ? sorted.find((s) => s.id === activeSeasonId) ?? null
    : null;

  const [lastUpload] = await db
    .select({ playedAt: scheduleGames.playedAt })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .innerJoin(seasons, eq(rounds.seasonId, seasons.id))
    .where(
      and(eq(seasons.leagueId, leagueId), isNotNull(scheduleGames.statsRawJson)),
    )
    .orderBy(desc(scheduleGames.playedAt))
    .limit(1);

  return {
    managerCount: managerRow?.n ?? 0,
    activeSeason: activeSeason
      ? { id: activeSeason.id, name: activeSeason.name, status: activeSeason.status }
      : null,
    lastGameUploadedAt: lastUpload?.playedAt ?? null,
  };
}

export async function getCommissionerSeasons(
  leagueId: string,
): Promise<CommissionerSeasonRow[]> {
  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const sorted = sortSeasonsForDisplay(seasonRows);
  if (sorted.length === 0) return [];

  const seasonIds = sorted.map((s) => s.id);
  const counts =
    seasonIds.length === 0
      ? []
      : await db
          .select({
            seasonId: rounds.seasonId,
            n: count(),
          })
          .from(scheduleGames)
          .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
          .where(inArray(rounds.seasonId, seasonIds))
          .groupBy(rounds.seasonId);

  const countBySeason = new Map(counts.map((row) => [row.seasonId, row.n]));

  return sorted.map((season) => ({
    id: season.id,
    name: season.name,
    status: season.status,
    gameCount: countBySeason.get(season.id) ?? 0,
  }));
}

export async function getCommissionerMembers(
  leagueId: string,
): Promise<CommissionerMember[]> {
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      role: leagueMembers.role,
      userCreatedAt: users.createdAt,
    })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(leagueMembers.leagueId, leagueId))
    .orderBy(users.username);

  return rows;
}
