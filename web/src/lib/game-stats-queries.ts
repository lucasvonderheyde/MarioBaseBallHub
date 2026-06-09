import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  characterGameStats,
  rounds,
  scheduleGames,
  seasons,
  teams,
  users,
} from "@/db/schema";
import {
  type BattingTotals,
  battingAverage,
  onBasePercentage,
  sluggingPercentage,
  sumBattingTotals,
} from "@/domain/stats/batting-metrics";

export type BattingLine = BattingTotals & {
  charId: string;
  charOccurrenceIndex: number;
  ba: number | null;
  obp: number | null;
  slg: number | null;
};

export function emptyBattingLine(charId: string): BattingLine {
  return {
    charId,
    charOccurrenceIndex: 0,
    games: 0,
    ab: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    walks4ball: 0,
    walksHbp: 0,
    sacFly: 0,
    rbi: 0,
    ba: null,
    obp: null,
    slg: null,
  };
}

export function getBattingLine(
  map: Map<string, BattingLine>,
  charId: string,
): BattingLine {
  return map.get(charId) ?? emptyBattingLine(charId);
}

export function battingStatKey(charId: string, charOccurrenceIndex: number): string {
  return `${charId}\0${charOccurrenceIndex}`;
}

function toBattingLine(
  charId: string,
  charOccurrenceIndex: number,
  row: {
    games: number;
    ab: number;
    hits: number;
    singles: number;
    doubles: number;
    triples: number;
    hr: number;
    walks4ball: number;
    walksHbp: number;
    sacFly: number;
    rbi: number;
  },
): BattingLine {
  const totals: BattingTotals = {
    games: row.games,
    ab: row.ab,
    hits: row.hits,
    singles: row.singles,
    doubles: row.doubles,
    triples: row.triples,
    hr: row.hr,
    walks4ball: row.walks4ball,
    walksHbp: row.walksHbp,
    sacFly: row.sacFly,
    rbi: row.rbi,
  };
  return {
    charId,
    charOccurrenceIndex,
    ...totals,
    ba: battingAverage(totals),
    obp: onBasePercentage(totals),
    slg: sluggingPercentage(totals),
  };
}

export async function getSeasonIdsForLeague(leagueId: string): Promise<string[]> {
  const rows = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));
  return rows.map((r) => r.id);
}

type StatFilter = {
  seasonId?: string;
  leagueId?: string;
  teamId?: string;
  managerUserId?: string;
  charId?: string;
  stadiumId?: string;
};

function seasonFilter(filter: StatFilter) {
  if (filter.seasonId) return eq(characterGameStats.seasonId, filter.seasonId);
  return sql`1=1`;
}

export async function aggregateBattingByCharId(
  filter: StatFilter,
): Promise<Map<string, BattingLine>> {
  const conditions = [seasonFilter(filter)];
  if (filter.teamId) conditions.push(eq(characterGameStats.teamId, filter.teamId));
  if (filter.charId) conditions.push(eq(characterGameStats.charId, filter.charId));
  if (filter.managerUserId) {
    conditions.push(eq(teams.managerUserId, filter.managerUserId));
  }
  if (filter.stadiumId) {
    conditions.push(eq(scheduleGames.statsStadiumId, filter.stadiumId));
  }

  let seasonIds: string[] | null = null;
  if (filter.leagueId && !filter.seasonId) {
    seasonIds = await getSeasonIdsForLeague(filter.leagueId);
    if (seasonIds.length === 0) return new Map();
    conditions.push(inArray(characterGameStats.seasonId, seasonIds));
  }

  const rows = await db
    .select({
      charId: characterGameStats.charId,
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
      ab: sql<number>`sum(${characterGameStats.ab})`.mapWith(Number),
      hits: sql<number>`sum(${characterGameStats.hits})`.mapWith(Number),
      singles: sql<number>`sum(${characterGameStats.singles})`.mapWith(Number),
      doubles: sql<number>`sum(${characterGameStats.doubles})`.mapWith(Number),
      triples: sql<number>`sum(${characterGameStats.triples})`.mapWith(Number),
      hr: sql<number>`sum(${characterGameStats.hr})`.mapWith(Number),
      walks4ball: sql<number>`sum(${characterGameStats.walks4ball})`.mapWith(Number),
      walksHbp: sql<number>`sum(${characterGameStats.walksHbp})`.mapWith(Number),
      sacFly: sql<number>`sum(${characterGameStats.sacFly})`.mapWith(Number),
      rbi: sql<number>`sum(${characterGameStats.rbi})`.mapWith(Number),
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .innerJoin(teams, eq(characterGameStats.teamId, teams.id))
    .where(and(...conditions))
    .groupBy(characterGameStats.charId);

  const map = new Map<string, BattingLine>();
  for (const r of rows) {
    map.set(r.charId, toBattingLine(r.charId, 0, r));
  }
  return map;
}

/** Season totals per character copy on a team (charId + occurrence index). */
export async function aggregateBattingByCharOccurrence(
  filter: StatFilter,
): Promise<Map<string, BattingLine>> {
  const conditions = [seasonFilter(filter)];
  if (filter.teamId) conditions.push(eq(characterGameStats.teamId, filter.teamId));
  if (filter.charId) conditions.push(eq(characterGameStats.charId, filter.charId));
  if (filter.managerUserId) {
    conditions.push(eq(teams.managerUserId, filter.managerUserId));
  }
  if (filter.stadiumId) {
    conditions.push(eq(scheduleGames.statsStadiumId, filter.stadiumId));
  }

  if (filter.leagueId && !filter.seasonId) {
    const seasonIds = await getSeasonIdsForLeague(filter.leagueId);
    if (seasonIds.length === 0) return new Map();
    conditions.push(inArray(characterGameStats.seasonId, seasonIds));
  }

  const rows = await db
    .select({
      charId: characterGameStats.charId,
      charOccurrenceIndex: characterGameStats.charOccurrenceIndex,
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
      ab: sql<number>`sum(${characterGameStats.ab})`.mapWith(Number),
      hits: sql<number>`sum(${characterGameStats.hits})`.mapWith(Number),
      singles: sql<number>`sum(${characterGameStats.singles})`.mapWith(Number),
      doubles: sql<number>`sum(${characterGameStats.doubles})`.mapWith(Number),
      triples: sql<number>`sum(${characterGameStats.triples})`.mapWith(Number),
      hr: sql<number>`sum(${characterGameStats.hr})`.mapWith(Number),
      walks4ball: sql<number>`sum(${characterGameStats.walks4ball})`.mapWith(Number),
      walksHbp: sql<number>`sum(${characterGameStats.walksHbp})`.mapWith(Number),
      sacFly: sql<number>`sum(${characterGameStats.sacFly})`.mapWith(Number),
      rbi: sql<number>`sum(${characterGameStats.rbi})`.mapWith(Number),
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .innerJoin(teams, eq(characterGameStats.teamId, teams.id))
    .where(and(...conditions))
    .groupBy(characterGameStats.charId, characterGameStats.charOccurrenceIndex);

  const map = new Map<string, BattingLine>();
  for (const r of rows) {
    map.set(
      battingStatKey(r.charId, r.charOccurrenceIndex),
      toBattingLine(r.charId, r.charOccurrenceIndex, r),
    );
  }
  return map;
}

export async function aggregateBattingByCharAndManager(
  filter: StatFilter,
): Promise<{ charId: string; managerUserId: string | null; username: string | null; line: BattingLine }[]> {
  const conditions = [seasonFilter(filter)];
  if (filter.charId) conditions.push(eq(characterGameStats.charId, filter.charId));
  if (filter.seasonId) conditions.push(eq(characterGameStats.seasonId, filter.seasonId));
  if (filter.leagueId && !filter.seasonId) {
    const seasonIds = await getSeasonIdsForLeague(filter.leagueId);
    if (seasonIds.length === 0) return [];
    conditions.push(inArray(characterGameStats.seasonId, seasonIds));
  }

  const rows = await db
    .select({
      charId: characterGameStats.charId,
      managerUserId: teams.managerUserId,
      username: users.username,
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
      ab: sql<number>`sum(${characterGameStats.ab})`.mapWith(Number),
      hits: sql<number>`sum(${characterGameStats.hits})`.mapWith(Number),
      singles: sql<number>`sum(${characterGameStats.singles})`.mapWith(Number),
      doubles: sql<number>`sum(${characterGameStats.doubles})`.mapWith(Number),
      triples: sql<number>`sum(${characterGameStats.triples})`.mapWith(Number),
      hr: sql<number>`sum(${characterGameStats.hr})`.mapWith(Number),
      walks4ball: sql<number>`sum(${characterGameStats.walks4ball})`.mapWith(Number),
      walksHbp: sql<number>`sum(${characterGameStats.walksHbp})`.mapWith(Number),
      sacFly: sql<number>`sum(${characterGameStats.sacFly})`.mapWith(Number),
      rbi: sql<number>`sum(${characterGameStats.rbi})`.mapWith(Number),
    })
    .from(characterGameStats)
    .innerJoin(teams, eq(characterGameStats.teamId, teams.id))
    .leftJoin(users, eq(teams.managerUserId, users.id))
    .where(and(...conditions))
    .groupBy(characterGameStats.charId, teams.managerUserId, users.username);

  return rows.map((r) => ({
    charId: r.charId,
    managerUserId: r.managerUserId,
    username: r.username,
    line: toBattingLine(r.charId, 0, r),
  }));
}

export async function aggregateBattingByCharAndSeason(
  charId: string,
  leagueId: string,
): Promise<{ seasonId: string; seasonName: string; line: BattingLine }[]> {
  const rows = await db
    .select({
      seasonId: seasons.id,
      seasonName: seasons.name,
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
      ab: sql<number>`sum(${characterGameStats.ab})`.mapWith(Number),
      hits: sql<number>`sum(${characterGameStats.hits})`.mapWith(Number),
      singles: sql<number>`sum(${characterGameStats.singles})`.mapWith(Number),
      doubles: sql<number>`sum(${characterGameStats.doubles})`.mapWith(Number),
      triples: sql<number>`sum(${characterGameStats.triples})`.mapWith(Number),
      hr: sql<number>`sum(${characterGameStats.hr})`.mapWith(Number),
      walks4ball: sql<number>`sum(${characterGameStats.walks4ball})`.mapWith(Number),
      walksHbp: sql<number>`sum(${characterGameStats.walksHbp})`.mapWith(Number),
      sacFly: sql<number>`sum(${characterGameStats.sacFly})`.mapWith(Number),
      rbi: sql<number>`sum(${characterGameStats.rbi})`.mapWith(Number),
    })
    .from(characterGameStats)
    .innerJoin(seasons, eq(characterGameStats.seasonId, seasons.id))
    .where(and(eq(characterGameStats.charId, charId), eq(seasons.leagueId, leagueId)))
    .groupBy(seasons.id, seasons.name);

  return rows.map((r) => ({
    seasonId: r.seasonId,
    seasonName: r.seasonName,
    line: toBattingLine(charId, 0, r),
  }));
}

export async function aggregateBattingByCharAndStadium(
  charId: string,
  leagueId: string,
  seasonId?: string,
): Promise<{ stadiumId: string; line: BattingLine }[]> {
  const conditions = [
    eq(characterGameStats.charId, charId),
    eq(seasons.leagueId, leagueId),
    sql`${scheduleGames.statsStadiumId} IS NOT NULL`,
  ];
  if (seasonId) conditions.push(eq(characterGameStats.seasonId, seasonId));

  const rows = await db
    .select({
      stadiumId: scheduleGames.statsStadiumId,
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
      ab: sql<number>`sum(${characterGameStats.ab})`.mapWith(Number),
      hits: sql<number>`sum(${characterGameStats.hits})`.mapWith(Number),
      singles: sql<number>`sum(${characterGameStats.singles})`.mapWith(Number),
      doubles: sql<number>`sum(${characterGameStats.doubles})`.mapWith(Number),
      triples: sql<number>`sum(${characterGameStats.triples})`.mapWith(Number),
      hr: sql<number>`sum(${characterGameStats.hr})`.mapWith(Number),
      walks4ball: sql<number>`sum(${characterGameStats.walks4ball})`.mapWith(Number),
      walksHbp: sql<number>`sum(${characterGameStats.walksHbp})`.mapWith(Number),
      sacFly: sql<number>`sum(${characterGameStats.sacFly})`.mapWith(Number),
      rbi: sql<number>`sum(${characterGameStats.rbi})`.mapWith(Number),
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .innerJoin(seasons, eq(characterGameStats.seasonId, seasons.id))
    .where(and(...conditions))
    .groupBy(scheduleGames.statsStadiumId);

  return rows
    .filter((r): r is typeof r & { stadiumId: string } => r.stadiumId != null)
    .map((r) => ({
      stadiumId: r.stadiumId,
      line: toBattingLine(charId, 0, r),
    }));
}

export async function getGameCharacterStats(gameId: string) {
  return db
    .select()
    .from(characterGameStats)
    .where(eq(characterGameStats.gameId, gameId))
    .orderBy(asc(characterGameStats.teamSide), asc(characterGameStats.rosterSlot));
}

export async function getDistinctCharsInLeague(
  leagueId: string,
  seasonId?: string,
): Promise<string[]> {
  const conditions = [eq(seasons.leagueId, leagueId)];
  if (seasonId) conditions.push(eq(characterGameStats.seasonId, seasonId));

  const rows = await db
    .selectDistinct({ charId: characterGameStats.charId })
    .from(characterGameStats)
    .innerJoin(seasons, eq(characterGameStats.seasonId, seasons.id))
    .where(and(...conditions));
  return rows.map((r) => r.charId).sort();
}

export async function getRecentGamesForChar(
  charId: string,
  leagueId: string,
  limit = 10,
) {
  return db
    .select({
      game: scheduleGames,
      stat: characterGameStats,
      team: teams,
      manager: users,
      seasonName: seasons.name,
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .innerJoin(teams, eq(characterGameStats.teamId, teams.id))
    .leftJoin(users, eq(teams.managerUserId, users.id))
    .innerJoin(seasons, eq(characterGameStats.seasonId, seasons.id))
    .where(and(eq(characterGameStats.charId, charId), eq(seasons.leagueId, leagueId)))
    .orderBy(sql`${scheduleGames.playedAt} DESC`)
    .limit(limit);
}

export async function getStadiumGameCounts(
  leagueId: string,
  seasonId?: string,
): Promise<Map<string, number>> {
  const conditions = [
    eq(seasons.leagueId, leagueId),
    sql`${scheduleGames.statsStadiumId} IS NOT NULL`,
    sql`${scheduleGames.statsRawJson} IS NOT NULL`,
  ];
  if (seasonId) conditions.push(eq(seasons.id, seasonId));

  const rows = await db
    .select({
      stadiumId: scheduleGames.statsStadiumId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .innerJoin(seasons, eq(rounds.seasonId, seasons.id))
    .where(and(...conditions))
    .groupBy(scheduleGames.statsStadiumId);

  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.stadiumId) map.set(r.stadiumId, r.count);
  }
  return map;
}

export async function getTopCharsAtStadium(
  stadiumGameId: string,
  leagueId: string,
  seasonId?: string,
  minAb = 5,
) {
  const conditions = [
    eq(scheduleGames.statsStadiumId, stadiumGameId),
    eq(seasons.leagueId, leagueId),
  ];
  if (seasonId) conditions.push(eq(characterGameStats.seasonId, seasonId));

  const rows = await db
    .select({
      charId: characterGameStats.charId,
      ab: sql<number>`sum(${characterGameStats.ab})`.mapWith(Number),
      hits: sql<number>`sum(${characterGameStats.hits})`.mapWith(Number),
      singles: sql<number>`sum(${characterGameStats.singles})`.mapWith(Number),
      doubles: sql<number>`sum(${characterGameStats.doubles})`.mapWith(Number),
      triples: sql<number>`sum(${characterGameStats.triples})`.mapWith(Number),
      hr: sql<number>`sum(${characterGameStats.hr})`.mapWith(Number),
      walks4ball: sql<number>`sum(${characterGameStats.walks4ball})`.mapWith(Number),
      walksHbp: sql<number>`sum(${characterGameStats.walksHbp})`.mapWith(Number),
      sacFly: sql<number>`sum(${characterGameStats.sacFly})`.mapWith(Number),
      rbi: sql<number>`sum(${characterGameStats.rbi})`.mapWith(Number),
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .innerJoin(seasons, eq(characterGameStats.seasonId, seasons.id))
    .where(and(...conditions))
    .groupBy(characterGameStats.charId);

  return rows
    .filter((r) => r.ab >= minAb)
    .map((r) => ({
      charId: r.charId,
      line: toBattingLine(r.charId, 0, r),
    }))
    .sort((a, b) => (b.line.slg ?? 0) - (a.line.slg ?? 0));
}

export async function getPlayerStadiumRecords(
  stadiumGameId: string,
  leagueId: string,
  seasonId?: string,
) {
  const conditions = [
    eq(scheduleGames.statsStadiumId, stadiumGameId),
    eq(seasons.leagueId, leagueId),
    sql`${scheduleGames.playedAt} IS NOT NULL`,
  ];
  if (seasonId) conditions.push(eq(seasons.id, seasonId));

  const homeTeams = db
    .select({ id: teams.id, managerUserId: teams.managerUserId })
    .from(teams)
    .as("home_teams");
  const awayTeams = db
    .select({ id: teams.id, managerUserId: teams.managerUserId })
    .from(teams)
    .as("away_teams");

  const games = await db
    .select({
      game: scheduleGames,
      homeManagerId: homeTeams.managerUserId,
      awayManagerId: awayTeams.managerUserId,
    })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .innerJoin(seasons, eq(rounds.seasonId, seasons.id))
    .innerJoin(homeTeams, eq(scheduleGames.homeTeamId, homeTeams.id))
    .innerJoin(awayTeams, eq(scheduleGames.awayTeamId, awayTeams.id))
    .where(and(...conditions));

  const managerIds = new Set<string>();
  for (const g of games) {
    if (g.homeManagerId) managerIds.add(g.homeManagerId);
    if (g.awayManagerId) managerIds.add(g.awayManagerId);
  }
  const managerRows =
    managerIds.size > 0
      ? await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(inArray(users.id, [...managerIds]))
      : [];
  const usernames = new Map(managerRows.map((m) => [m.id, m.username]));

  type Rec = {
    username: string;
    games: number;
    runsScored: number;
    runsAllowed: number;
    wins: number;
    losses: number;
  };
  const byUser = new Map<string, Rec>();

  function bump(userId: string, scored: number, allowed: number, won: boolean) {
    const username = usernames.get(userId);
    if (!username) return;
    const cur = byUser.get(userId) ?? {
      username,
      games: 0,
      runsScored: 0,
      runsAllowed: 0,
      wins: 0,
      losses: 0,
    };
    cur.games++;
    cur.runsScored += scored;
    cur.runsAllowed += allowed;
    if (won) cur.wins++;
    else cur.losses++;
    byUser.set(userId, cur);
  }

  for (const g of games) {
    const hs = g.game.homeScore ?? 0;
    const as = g.game.awayScore ?? 0;
    if (g.homeManagerId) bump(g.homeManagerId, hs, as, hs > as);
    if (g.awayManagerId) bump(g.awayManagerId, as, hs, as > hs);
  }
  return [...byUser.values()].sort((a, b) => a.username.localeCompare(b.username));
}

export async function getManagersInLeague(leagueId: string) {
  const seasonIds = await getSeasonIdsForLeague(leagueId);
  if (seasonIds.length === 0) return [];
  return db
    .selectDistinct({ id: users.id, username: users.username })
    .from(teams)
    .innerJoin(users, eq(teams.managerUserId, users.id))
    .where(inArray(teams.seasonId, seasonIds))
    .orderBy(users.username);
}

export { sumBattingTotals, toBattingLine };
