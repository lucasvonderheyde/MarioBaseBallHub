import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  leagueMembers,
  leagues,
  rounds,
  scheduleGames,
  seasons,
  teams,
  users,
} from "@/db/schema";
import type { DecodedGameSummary } from "@/domain/stats/decode-game-file";
import { canUserReportGame, type LeagueRole } from "@/lib/game-report-access";
import { managerNetplayLabels, netplayLabelMatches } from "@/lib/netplay-label";
import { isUserNetplayParticipantInFile } from "@/lib/upload-participant";

export type ReportableGame = {
  gameId: string;
  leagueId: string;
  seasonId: string;
  seasonName: string;
  leagueName: string;
  awayTeamName: string;
  homeTeamName: string;
  awayManagerUsername: string | null;
  homeManagerUsername: string | null;
};

type Membership = { leagueId: string; role: LeagueRole };

export async function getReportableGamesForUser(userId: string): Promise<ReportableGame[]> {
  const memberships = await db
    .select({ leagueId: leagueMembers.leagueId, role: leagueMembers.role })
    .from(leagueMembers)
    .where(eq(leagueMembers.userId, userId));

  if (memberships.length === 0) return [];

  const roleByLeague = new Map(memberships.map((m) => [m.leagueId, m.role as LeagueRole]));

  const awayTeams = db.select().from(teams).as("away_teams");
  const homeTeams = db.select().from(teams).as("home_teams");
  const awayManagers = db.select().from(users).as("away_managers");
  const homeManagers = db.select().from(users).as("home_managers");

  const rows = await db
    .select({
      gameId: scheduleGames.id,
      leagueId: leagues.id,
      seasonId: seasons.id,
      seasonName: seasons.name,
      leagueName: leagues.name,
      awayTeamName: awayTeams.name,
      homeTeamName: homeTeams.name,
      awayManagerUserId: awayTeams.managerUserId,
      homeManagerUserId: homeTeams.managerUserId,
      awayManagerUsername: awayManagers.username,
      homeManagerUsername: homeManagers.username,
    })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .innerJoin(seasons, eq(rounds.seasonId, seasons.id))
    .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
    .innerJoin(awayTeams, eq(scheduleGames.awayTeamId, awayTeams.id))
    .innerJoin(homeTeams, eq(scheduleGames.homeTeamId, homeTeams.id))
    .leftJoin(awayManagers, eq(awayTeams.managerUserId, awayManagers.id))
    .leftJoin(homeManagers, eq(homeTeams.managerUserId, homeManagers.id))
    .where(isNull(scheduleGames.statsRawJson));

  const reportable: ReportableGame[] = [];
  for (const row of rows) {
    const role = roleByLeague.get(row.leagueId);
    if (
      !canUserReportGame(
        userId,
        role ?? null,
        row.awayManagerUserId,
        row.homeManagerUserId,
      )
    ) {
      continue;
    }
    reportable.push({
      gameId: row.gameId,
      leagueId: row.leagueId,
      seasonId: row.seasonId,
      seasonName: row.seasonName,
      leagueName: row.leagueName,
      awayTeamName: row.awayTeamName,
      homeTeamName: row.homeTeamName,
      awayManagerUsername: row.awayManagerUsername,
      homeManagerUsername: row.homeManagerUsername,
    });
  }

  return reportable;
}

export async function findGameForStatsFile(
  user: { id: string; username: string; displayName?: string | null; netplayUsername?: string | null },
  role: LeagueRole,
  leagueId: string,
  seasonId: string,
  parsed: DecodedGameSummary,
): Promise<{ gameId: string } | { error: string }> {
  if (
    !isUserNetplayParticipantInFile(user, parsed.awayPlayer, parsed.homePlayer)
  ) {
    return {
      error:
        "Your netplay username must match Home Player or Away Player in this file.",
    };
  }

  const [byGameId] = await db
    .select({ id: scheduleGames.id, statsRawJson: scheduleGames.statsRawJson })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .where(
      and(
        eq(rounds.seasonId, seasonId),
        eq(scheduleGames.statsGameId, parsed.statsGameId),
      ),
    )
    .limit(1);

  if (byGameId) {
    return { gameId: byGameId.id };
  }

  const awayTeams = db.select().from(teams).as("away_teams");
  const homeTeams = db.select().from(teams).as("home_teams");
  const awayManagers = db.select().from(users).as("away_managers");
  const homeManagers = db.select().from(users).as("home_managers");

  const candidates = await db
    .select({
      gameId: scheduleGames.id,
      awayManagerUserId: awayTeams.managerUserId,
      homeManagerUserId: homeTeams.managerUserId,
      awayLabels: awayManagers.username,
      homeLabels: homeManagers.username,
      awayNetplay: awayManagers.netplayUsername,
      homeNetplay: homeManagers.netplayUsername,
      awayDisplay: awayManagers.displayName,
      homeDisplay: homeManagers.displayName,
    })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .innerJoin(awayTeams, eq(scheduleGames.awayTeamId, awayTeams.id))
    .innerJoin(homeTeams, eq(scheduleGames.homeTeamId, homeTeams.id))
    .leftJoin(awayManagers, eq(awayTeams.managerUserId, awayManagers.id))
    .leftJoin(homeManagers, eq(homeTeams.managerUserId, homeManagers.id))
    .where(and(eq(rounds.seasonId, seasonId), isNull(scheduleGames.statsRawJson)));

  for (const game of candidates) {
    if (
      !canUserReportGame(
        user.id,
        role,
        game.awayManagerUserId,
        game.homeManagerUserId,
      )
    ) {
      continue;
    }

    const awayLabels = managerNetplayLabels({
      username: game.awayLabels ?? "",
      netplayUsername: game.awayNetplay,
      displayName: game.awayDisplay,
    });
    const homeLabels = managerNetplayLabels({
      username: game.homeLabels ?? "",
      netplayUsername: game.homeNetplay,
      displayName: game.homeDisplay,
    });

    const awayInFile = netplayLabelMatches(awayLabels, parsed.awayPlayer);
    const homeInFile = netplayLabelMatches(homeLabels, parsed.homePlayer);
    const awayInFileAsHome = netplayLabelMatches(awayLabels, parsed.homePlayer);
    const homeInFileAsAway = netplayLabelMatches(homeLabels, parsed.awayPlayer);

    if (
      (awayInFile && homeInFile) ||
      (awayInFileAsHome && homeInFileAsAway)
    ) {
      return { gameId: game.gameId };
    }
  }

  return { error: "No matching unreported game found for this file in the season." };
}
