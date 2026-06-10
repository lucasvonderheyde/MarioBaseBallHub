import { count, isNotNull, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  characterGameStats,
  leagueMembers,
  leagues,
  managerPersonalGames,
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
    scheduleGamesWithStatsJson: number;
    characterGameStats: number;
    personalGames: number;
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
    gamesWithJsonN,
    statsN,
    personalGamesN,
  ] = await Promise.all([
    db.select({ n: count() }).from(users).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(leagues).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(leagueMembers).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(seasons).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(teams).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(scheduleGames).then((r) => r[0]?.n ?? 0),
    db
      .select({ n: count() })
      .from(scheduleGames)
      .where(isNotNull(scheduleGames.statsRawJson))
      .then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(characterGameStats).then((r) => r[0]?.n ?? 0),
    db.select({ n: count() }).from(managerPersonalGames).then((r) => r[0]?.n ?? 0),
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

  if (seasonsN === 0 && leaguesN > 0) {
    warnings.push(
      "League exists but every season row is missing. The league shell may have been recreated after a delete. " +
        "Use a league backup JSON to restore structure, then re-upload game files or run season backfill.",
    );
  }

  if (seasonsN === 0 && gamesN === 0 && statsN === 0 && personalGamesN > 0) {
    warnings.push(
      `${personalGamesN} personal game upload(s) still exist on manager accounts (/account). ` +
        "League schedule stats were wiped, but those JSON files can be re-linked after you rebuild the season.",
    );
  }

  if (seasonsN === 0 && gamesN === 0 && statsN === 0 && personalGamesN === 0) {
    warnings.push(
      "No league seasons, schedule games, parsed stats, or personal uploads remain. " +
        "Deleting a league (now cascades with foreign keys) removes all season data permanently unless you have a backup JSON.",
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
      scheduleGamesWithStatsJson: gamesWithJsonN,
      characterGameStats: statsN,
      personalGames: personalGamesN,
    },
    orphanedLeagueMembers,
    orphanedSeasonLeagueIds,
    warnings,
  };
}
