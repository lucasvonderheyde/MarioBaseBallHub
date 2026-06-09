import { and, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  leagues,
  managerPersonalGames,
  scheduleGames,
  seasons,
  teams,
  users,
} from "@/db/schema";
import {
  managerNetplayLabels,
  netplayLabelMatches,
  type NetplayUserLike,
} from "@/lib/netplay-label";

export type H2hManagerOption = {
  id: string;
  username: string;
  displayName: string | null;
};

export type H2hSeasonOption = {
  id: string;
  name: string;
  leagueId: string;
  leagueName: string;
};

export type H2hGameResult = {
  id: string;
  source: "league" | "friendly";
  playedAt: Date | null;
  label: string;
  managerAScore: number;
  managerBScore: number;
  managerAWon: boolean;
  leagueId?: string;
  seasonId?: string;
  seasonName?: string;
  leagueName?: string;
};

export type HeadToHeadComparison = {
  managerA: H2hManagerOption;
  managerB: H2hManagerOption;
  scopeLabel: string;
  games: number;
  managerAWins: number;
  managerBWins: number;
  managerARuns: number;
  managerBRuns: number;
  recentGames: H2hGameResult[];
};

function managersOpposedInPersonalGame(
  userA: NetplayUserLike,
  userB: NetplayUserLike,
  awayPlayer: string,
  homePlayer: string,
): boolean {
  const labelsA = managerNetplayLabels(userA);
  const labelsB = managerNetplayLabels(userB);
  const aAway = netplayLabelMatches(labelsA, awayPlayer);
  const aHome = netplayLabelMatches(labelsA, homePlayer);
  const bAway = netplayLabelMatches(labelsB, awayPlayer);
  const bHome = netplayLabelMatches(labelsB, homePlayer);
  return (aAway && bHome) || (aHome && bAway);
}

function scoreForManager(
  managerId: string,
  homeManagerId: string | null,
  awayManagerId: string | null,
  homeScore: number,
  awayScore: number,
): { ours: number; theirs: number; won: boolean } | null {
  if (homeManagerId === managerId && awayManagerId !== managerId) {
    return {
      ours: homeScore,
      theirs: awayScore,
      won: homeScore > awayScore,
    };
  }
  if (awayManagerId === managerId && homeManagerId !== managerId) {
    return {
      ours: awayScore,
      theirs: homeScore,
      won: awayScore > homeScore,
    };
  }
  return null;
}

export async function getH2hManagerOptions(): Promise<H2hManagerOption[]> {
  const teamManagers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(users)
    .innerJoin(teams, eq(teams.managerUserId, users.id))
    .groupBy(users.id);

  const personalManagers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(users)
    .innerJoin(managerPersonalGames, eq(managerPersonalGames.managerUserId, users.id))
    .groupBy(users.id);

  const byId = new Map<string, H2hManagerOption>();
  for (const row of [...teamManagers, ...personalManagers]) {
    byId.set(row.id, row);
  }

  return [...byId.values()].sort((a, b) =>
    (a.displayName ?? a.username).localeCompare(b.displayName ?? b.username),
  );
}

export async function getH2hSeasonOptions(): Promise<H2hSeasonOption[]> {
  const seasonsWithGames = await db
    .selectDistinct({
      seasonId: teams.seasonId,
    })
    .from(scheduleGames)
    .innerJoin(
      teams,
      or(
        eq(scheduleGames.homeTeamId, teams.id),
        eq(scheduleGames.awayTeamId, teams.id),
      ),
    )
    .where(
      and(
        isNotNull(scheduleGames.homeScore),
        isNotNull(scheduleGames.awayScore),
      ),
    );

  const seasonIds = [...new Set(seasonsWithGames.map((row) => row.seasonId))];
  if (seasonIds.length === 0) return [];

  const seasonRows = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      leagueId: seasons.leagueId,
    })
    .from(seasons)
    .where(inArray(seasons.id, seasonIds));

  const leagueIds = [...new Set(seasonRows.map((season) => season.leagueId))];
  const leaguesList = await db
    .select()
    .from(leagues)
    .where(inArray(leagues.id, leagueIds));
  const leagueNameById = new Map(leaguesList.map((league) => [league.id, league.name]));

  return seasonRows
    .map((season) => ({
      id: season.id,
      name: season.name,
      leagueId: season.leagueId,
      leagueName: leagueNameById.get(season.leagueId) ?? "League",
    }))
    .sort(
      (a, b) =>
        a.leagueName.localeCompare(b.leagueName) || a.name.localeCompare(b.name),
    );
}

async function loadManagers(
  managerAId: string,
  managerBId: string,
): Promise<[H2hManagerOption, H2hManagerOption] | null> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      netplayUsername: users.netplayUsername,
    })
    .from(users)
    .where(inArray(users.id, [managerAId, managerBId]));

  const a = rows.find((row) => row.id === managerAId);
  const b = rows.find((row) => row.id === managerBId);
  if (!a || !b || managerAId === managerBId) return null;

  return [
    { id: a.id, username: a.username, displayName: a.displayName },
    { id: b.id, username: b.username, displayName: b.displayName },
  ];
}

async function loadLeagueMatchups(
  managerAId: string,
  managerBId: string,
  seasonId?: string,
): Promise<H2hGameResult[]> {
  const homeTeams = db
    .select({ id: teams.id, managerUserId: teams.managerUserId, seasonId: teams.seasonId })
    .from(teams)
    .as("home_teams");
  const awayTeams = db
    .select({ id: teams.id, managerUserId: teams.managerUserId, seasonId: teams.seasonId })
    .from(teams)
    .as("away_teams");

  const conditions = [
    isNotNull(scheduleGames.homeScore),
    isNotNull(scheduleGames.awayScore),
    or(
      and(
        eq(homeTeams.managerUserId, managerAId),
        eq(awayTeams.managerUserId, managerBId),
      ),
      and(
        eq(homeTeams.managerUserId, managerBId),
        eq(awayTeams.managerUserId, managerAId),
      ),
    ),
  ];
  if (seasonId) {
    conditions.push(eq(homeTeams.seasonId, seasonId));
  }

  const rows = await db
    .select({
      id: scheduleGames.id,
      homeScore: scheduleGames.homeScore,
      awayScore: scheduleGames.awayScore,
      playedAt: scheduleGames.playedAt,
      homeManagerId: homeTeams.managerUserId,
      awayManagerId: awayTeams.managerUserId,
      seasonId: homeTeams.seasonId,
    })
    .from(scheduleGames)
    .innerJoin(homeTeams, eq(scheduleGames.homeTeamId, homeTeams.id))
    .innerJoin(awayTeams, eq(scheduleGames.awayTeamId, awayTeams.id))
    .where(and(...conditions))
    .orderBy(desc(scheduleGames.playedAt));

  const seasonIds = [...new Set(rows.map((r) => r.seasonId))];
  const seasonMeta = seasonIds.length
    ? await db
        .select({ id: seasons.id, name: seasons.name, leagueId: seasons.leagueId })
        .from(seasons)
        .where(inArray(seasons.id, seasonIds))
    : [];
  const seasonMap = new Map(seasonMeta.map((s) => [s.id, s]));

  const leagueIds = [...new Set(seasonMeta.map((s) => s.leagueId))];
  const leagueRows = leagueIds.length
    ? await db.select().from(leagues).where(inArray(leagues.id, leagueIds))
    : [];
  const leagueMap = new Map(leagueRows.map((l) => [l.id, l.name]));

  const teamRows = seasonIds.length
    ? await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(inArray(teams.seasonId, seasonIds))
    : [];
  const teamNameById = new Map(teamRows.map((t) => [t.id, t.name]));

  // Need away/home team names - re-query with team ids
  const gameIds = rows.map((r) => r.id);
  const gameTeams = gameIds.length
    ? await db
        .select({
          id: scheduleGames.id,
          homeTeamId: scheduleGames.homeTeamId,
          awayTeamId: scheduleGames.awayTeamId,
        })
        .from(scheduleGames)
        .where(inArray(scheduleGames.id, gameIds))
    : [];
  const gameTeamMap = new Map(gameTeams.map((g) => [g.id, g]));

  const results: H2hGameResult[] = [];

  for (const row of rows) {
    if (row.homeScore == null || row.awayScore == null) continue;
    const teamsForGame = gameTeamMap.get(row.id);
    const awayName = teamsForGame
      ? (teamNameById.get(teamsForGame.awayTeamId) ?? "Away")
      : "Away";
    const homeName = teamsForGame
      ? (teamNameById.get(teamsForGame.homeTeamId) ?? "Home")
      : "Home";

    const scoreA = scoreForManager(
      managerAId,
      row.homeManagerId,
      row.awayManagerId,
      row.homeScore,
      row.awayScore,
    );
    if (!scoreA) continue;

    const season = seasonMap.get(row.seasonId);
    const leagueName = season ? leagueMap.get(season.leagueId) : undefined;

    results.push({
      id: row.id,
      source: "league",
      playedAt: row.playedAt,
      label: `${awayName} ${row.awayScore}–${row.homeScore} ${homeName}`,
      managerAScore: scoreA.ours,
      managerBScore: scoreA.theirs,
      managerAWon: scoreA.won,
      leagueId: season?.leagueId,
      seasonId: row.seasonId,
      seasonName: season?.name,
      leagueName,
    });
  }

  return results;
}

async function loadFriendlyMatchups(
  userA: NetplayUserLike,
  userB: NetplayUserLike,
): Promise<H2hGameResult[]> {
  const rows = await db
    .select({
      id: managerPersonalGames.id,
      awayPlayer: managerPersonalGames.awayPlayer,
      homePlayer: managerPersonalGames.homePlayer,
      awayScore: managerPersonalGames.awayScore,
      homeScore: managerPersonalGames.homeScore,
      playedAt: managerPersonalGames.playedAt,
    })
    .from(managerPersonalGames)
    .orderBy(desc(managerPersonalGames.playedAt));

  const results: H2hGameResult[] = [];

  for (const row of rows) {
    if (!managersOpposedInPersonalGame(userA, userB, row.awayPlayer, row.homePlayer)) {
      continue;
    }

    const aSide = netplayLabelMatches(managerNetplayLabels(userA), row.awayPlayer)
      ? "away"
      : "home";
    const scoreA = aSide === "away" ? row.awayScore : row.homeScore;
    const scoreB = aSide === "away" ? row.homeScore : row.awayScore;

    results.push({
      id: row.id,
      source: "friendly",
      playedAt: row.playedAt,
      label: `${row.awayPlayer} ${row.awayScore}–${row.homeScore} ${row.homePlayer}`,
      managerAScore: scoreA,
      managerBScore: scoreB,
      managerAWon: scoreA > scoreB,
    });
  }

  return results;
}

export async function getHeadToHeadComparison(input: {
  managerAId: string;
  managerBId: string;
  seasonId?: string;
}): Promise<HeadToHeadComparison | null> {
  const managers = await loadManagers(input.managerAId, input.managerBId);
  if (!managers) return null;

  const [managerA, managerB] = managers;

  const userRows = await db
    .select()
    .from(users)
    .where(inArray(users.id, [input.managerAId, input.managerBId]));
  const userA = userRows.find((u) => u.id === input.managerAId)!;
  const userB = userRows.find((u) => u.id === input.managerBId)!;

  const leagueGames = await loadLeagueMatchups(
    input.managerAId,
    input.managerBId,
    input.seasonId,
  );

  const friendlyGames = input.seasonId
    ? []
    : await loadFriendlyMatchups(userA, userB);

  const allGames = [...leagueGames, ...friendlyGames].sort(
    (a, b) => (b.playedAt?.getTime() ?? 0) - (a.playedAt?.getTime() ?? 0),
  );

  let scopeLabel = "Lifetime";
  if (input.seasonId) {
    const [season] = await db
      .select({ name: seasons.name })
      .from(seasons)
      .where(eq(seasons.id, input.seasonId))
      .limit(1);
    scopeLabel = season?.name ?? "Season";
  }

  let managerAWins = 0;
  let managerBWins = 0;
  let managerARuns = 0;
  let managerBRuns = 0;

  for (const game of allGames) {
    managerARuns += game.managerAScore;
    managerBRuns += game.managerBScore;
    if (game.managerAWon) managerAWins++;
    else managerBWins++;
  }

  return {
    managerA,
    managerB,
    scopeLabel,
    games: allGames.length,
    managerAWins,
    managerBWins,
    managerARuns,
    managerBRuns,
    recentGames: allGames.slice(0, 15),
  };
}
