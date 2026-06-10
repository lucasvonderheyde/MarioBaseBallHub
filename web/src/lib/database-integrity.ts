import { count, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  characterGameStats,
  leagueMembers,
  leagues,
  scheduleGames,
  seasons,
  teams,
  users,
} from "@/db/schema";

export type DatabaseIntegrityReport = {
  counts: {
    users: number;
    leagues: number;
    leagueMembers: number;
    seasons: number;
    teams: number;
    scheduleGames: number;
    characterGameStats: number;
  };
  orphanedLeagueMembers: number;
  orphanedSeasonLeagueIds: string[];
  warnings: string[];
};

export async function getDatabaseIntegrityReport(): Promise<DatabaseIntegrityReport> {
  const [
    usersN,
    leaguesN,
    membersN,
    seasonsN,
    teamsN,
    gamesN,
    statsN,
  ] = await Promise.all([
    db.select({ n: count() }).from(users).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(leagues).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(leagueMembers).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(seasons).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(teams).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(scheduleGames).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(characterGameStats).then((r) => r[0]?.n ?? 0),
  ]);

  const leagueIds = await db.select({ id: leagues.id }).from(leagues);
  const knownLeagueIds = leagueIds.map((row) => row.id);

  let orphanedLeagueMembers = 0;
  if (knownLeagueIds.length === 0) {
    orphanedLeagueMembers = membersN;
  } else {
    const orphanMembers = await db
      .select({ n: count() })
      .from(leagueMembers)
      .where(notInArray(leagueMembers.leagueId, knownLeagueIds));
    orphanedLeagueMembers = orphanMembers[0]?.n ?? 0;
  }

  const seasonLeagueIds = await db
    .selectDistinct({ leagueId: seasons.leagueId })
    .from(seasons);
  const orphanedSeasonLeagueIds = seasonLeagueIds
    .map((row) => row.leagueId)
    .filter((leagueId) => !knownLeagueIds.includes(leagueId));

  const warnings: string[] = [];

  if (leaguesN === 0 && (seasonsN > 0 || gamesN > 0 || statsN > 0)) {
    warnings.push(
      "No leagues exist, but seasons/games/stats rows are still in the database. " +
        "League metadata was likely deleted while game data remains (SQLite foreign keys were not enforced). " +
        "Restore from a league backup JSON on this page, or contact support to rebuild the league shell from orphaned seasons.",
    );
  }

  if (orphanedLeagueMembers > 0) {
    warnings.push(
      `${orphanedLeagueMembers} league_members row(s) point to deleted leagues. ` +
        "Those memberships are invisible on /leagues and can cause 404 redirects after login.",
    );
  }

  if (orphanedSeasonLeagueIds.length > 0) {
    warnings.push(
      `Seasons reference ${orphanedSeasonLeagueIds.length} missing league id(s): ${orphanedSeasonLeagueIds.join(", ")}.`,
    );
  }

  if (leaguesN > 0 && membersN === 0) {
    warnings.push(
      "Leagues exist but no league_members rows were found. Managers may need to be re-invited.",
    );
  }

  return {
    counts: {
      users: usersN,
      leagues: leaguesN,
      leagueMembers: membersN,
      seasons: seasonsN,
      teams: teamsN,
      scheduleGames: gamesN,
      characterGameStats: statsN,
    },
    orphanedLeagueMembers,
    orphanedSeasonLeagueIds,
    warnings,
  };
}
