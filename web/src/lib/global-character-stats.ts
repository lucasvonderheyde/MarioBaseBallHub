import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  characterGameStats,
  characters,
  leagues,
  managerPersonalCharacterStats,
  managerPersonalGames,
  scheduleGames,
  seasons,
  teams,
  users,
} from "@/db/schema";
import {
  toBattingLine,
  type BattingLine,
  type PitchingLine,
} from "@/lib/game-stats-queries";
import {
  mergeBattingMaps,
  mergePitchingMaps,
} from "@/lib/personal-game-stats";

export type GlobalCharacterEntry = {
  gameCharId: string;
  displayName: string;
  mugshotFile: string | null;
};

function toPitchingLine(
  charId: string,
  charOccurrenceIndex: number,
  row: {
    games: number;
    outsPitched: number;
    battersFaced: number;
    hitsAllowed: number;
    runsAllowed: number;
    earnedRuns: number;
    walks: number;
    strikeouts: number;
    hrAllowed: number;
    pitchesThrown: number;
    gamesStarted?: number;
    reliefAppearances?: number;
  },
): PitchingLine {
  return {
    charId,
    charOccurrenceIndex,
    games: row.games,
    gamesStarted: row.gamesStarted ?? 0,
    reliefAppearances: row.reliefAppearances ?? 0,
    outsPitched: row.outsPitched,
    battersFaced: row.battersFaced,
    hitsAllowed: row.hitsAllowed,
    runsAllowed: row.runsAllowed,
    earnedRuns: row.earnedRuns,
    walks: row.walks,
    strikeouts: row.strikeouts,
    hrAllowed: row.hrAllowed,
    pitchesThrown: row.pitchesThrown,
  };
}

async function aggregateLeagueBattingByCharId(
  managerUserId?: string,
): Promise<Map<string, BattingLine>> {
  const conditions = [];
  if (managerUserId) {
    conditions.push(eq(teams.managerUserId, managerUserId));
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(characterGameStats.charId);

  const map = new Map<string, BattingLine>();
  for (const row of rows) {
    map.set(row.charId, toBattingLine(row.charId, 0, row));
  }
  return map;
}

async function aggregatePersonalBattingByCharId(
  managerUserId?: string,
): Promise<Map<string, BattingLine>> {
  const conditions = [];
  if (managerUserId) {
    conditions.push(eq(managerPersonalCharacterStats.managerUserId, managerUserId));
  }

  const rows = await db
    .select({
      charId: managerPersonalCharacterStats.charId,
      games: sql<number>`count(distinct ${managerPersonalCharacterStats.personalGameId})`.mapWith(
        Number,
      ),
      ab: sql<number>`sum(${managerPersonalCharacterStats.ab})`.mapWith(Number),
      hits: sql<number>`sum(${managerPersonalCharacterStats.hits})`.mapWith(Number),
      singles: sql<number>`sum(${managerPersonalCharacterStats.singles})`.mapWith(Number),
      doubles: sql<number>`sum(${managerPersonalCharacterStats.doubles})`.mapWith(Number),
      triples: sql<number>`sum(${managerPersonalCharacterStats.triples})`.mapWith(Number),
      hr: sql<number>`sum(${managerPersonalCharacterStats.hr})`.mapWith(Number),
      walks4ball: sql<number>`sum(${managerPersonalCharacterStats.walks4ball})`.mapWith(Number),
      walksHbp: sql<number>`sum(${managerPersonalCharacterStats.walksHbp})`.mapWith(Number),
      sacFly: sql<number>`sum(${managerPersonalCharacterStats.sacFly})`.mapWith(Number),
      rbi: sql<number>`sum(${managerPersonalCharacterStats.rbi})`.mapWith(Number),
    })
    .from(managerPersonalCharacterStats)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(managerPersonalCharacterStats.charId);

  const map = new Map<string, BattingLine>();
  for (const row of rows) {
    map.set(row.charId, toBattingLine(row.charId, 0, row));
  }
  return map;
}

async function aggregateLeaguePitchingByCharId(
  managerUserId?: string,
): Promise<Map<string, PitchingLine>> {
  const conditions = [];
  if (managerUserId) {
    conditions.push(eq(teams.managerUserId, managerUserId));
  }

  const rows = await db
    .select({
      charId: characterGameStats.charId,
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
      outsPitched: sql<number>`sum(${characterGameStats.outsPitched})`.mapWith(Number),
      battersFaced: sql<number>`sum(${characterGameStats.battersFaced})`.mapWith(Number),
      hitsAllowed: sql<number>`sum(${characterGameStats.hitsAllowed})`.mapWith(Number),
      runsAllowed: sql<number>`sum(${characterGameStats.runsAllowed})`.mapWith(Number),
      earnedRuns: sql<number>`sum(${characterGameStats.earnedRuns})`.mapWith(Number),
      walks: sql<number>`sum(${characterGameStats.pitchingWalks} + ${characterGameStats.battersHit})`.mapWith(Number),
      strikeouts: sql<number>`sum(${characterGameStats.strikeoutsDef})`.mapWith(Number),
      hrAllowed: sql<number>`sum(${characterGameStats.hrAllowed})`.mapWith(Number),
      pitchesThrown: sql<number>`sum(${characterGameStats.pitchesThrown})`.mapWith(Number),
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .innerJoin(teams, eq(characterGameStats.teamId, teams.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(characterGameStats.charId);

  const map = new Map<string, PitchingLine>();
  for (const row of rows) {
    if (row.outsPitched === 0 && row.battersFaced === 0 && row.games === 0) continue;
    map.set(row.charId, toPitchingLine(row.charId, 0, row));
  }
  return map;
}

async function aggregatePersonalPitchingByCharId(
  managerUserId?: string,
): Promise<Map<string, PitchingLine>> {
  const conditions = [];
  if (managerUserId) {
    conditions.push(eq(managerPersonalCharacterStats.managerUserId, managerUserId));
  }

  const rows = await db
    .select({
      charId: managerPersonalCharacterStats.charId,
      games: sql<number>`count(distinct case when ${managerPersonalCharacterStats.outsPitched} > 0 or ${managerPersonalCharacterStats.battersFaced} > 0 then ${managerPersonalCharacterStats.personalGameId} end)`.mapWith(
        Number,
      ),
      outsPitched: sql<number>`sum(${managerPersonalCharacterStats.outsPitched})`.mapWith(Number),
      battersFaced: sql<number>`sum(${managerPersonalCharacterStats.battersFaced})`.mapWith(Number),
      hitsAllowed: sql<number>`sum(${managerPersonalCharacterStats.hitsAllowed})`.mapWith(Number),
      runsAllowed: sql<number>`sum(${managerPersonalCharacterStats.runsAllowed})`.mapWith(Number),
      earnedRuns: sql<number>`sum(${managerPersonalCharacterStats.earnedRuns})`.mapWith(Number),
      walks: sql<number>`sum(${managerPersonalCharacterStats.pitchingWalks})`.mapWith(Number),
      strikeouts: sql<number>`sum(${managerPersonalCharacterStats.strikeoutsDef})`.mapWith(Number),
      hrAllowed: sql<number>`sum(${managerPersonalCharacterStats.hrAllowed})`.mapWith(Number),
      pitchesThrown: sql<number>`sum(${managerPersonalCharacterStats.pitchesThrown})`.mapWith(
        Number,
      ),
    })
    .from(managerPersonalCharacterStats)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(managerPersonalCharacterStats.charId);

  const map = new Map<string, PitchingLine>();
  for (const row of rows) {
    if (row.outsPitched === 0 && row.battersFaced === 0 && row.games === 0) continue;
    map.set(row.charId, toPitchingLine(row.charId, 0, row));
  }
  return map;
}

export async function getGlobalCharacterCatalog(): Promise<GlobalCharacterEntry[]> {
  const rows = await db
    .select({
      gameCharId: characters.gameCharId,
      displayName: characters.displayName,
      mugshotFile: characters.mugshotFile,
    })
    .from(characters)
    .orderBy(asc(characters.displayName));

  return rows;
}

export async function getGlobalCharacterByGameCharId(
  gameCharId: string,
): Promise<GlobalCharacterEntry | null> {
  const [row] = await db
    .select({
      gameCharId: characters.gameCharId,
      displayName: characters.displayName,
      mugshotFile: characters.mugshotFile,
    })
    .from(characters)
    .where(eq(characters.gameCharId, gameCharId))
    .limit(1);
  return row ?? null;
}

export async function aggregateGlobalBattingByCharId(
  managerUserId?: string,
): Promise<Map<string, BattingLine>> {
  const [league, personal] = await Promise.all([
    aggregateLeagueBattingByCharId(managerUserId),
    aggregatePersonalBattingByCharId(managerUserId),
  ]);
  return mergeBattingMaps(league, personal);
}

export async function aggregateGlobalPitchingByCharId(
  managerUserId?: string,
): Promise<Map<string, PitchingLine>> {
  const [league, personal] = await Promise.all([
    aggregateLeaguePitchingByCharId(managerUserId),
    aggregatePersonalPitchingByCharId(managerUserId),
  ]);
  return mergePitchingMaps(league, personal);
}

export async function getGlobalManagers(): Promise<
  { id: string; username: string; displayName: string | null }[]
> {
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
    .innerJoin(
      managerPersonalCharacterStats,
      eq(managerPersonalCharacterStats.managerUserId, users.id),
    )
    .groupBy(users.id);

  const byId = new Map<string, { id: string; username: string; displayName: string | null }>();
  for (const row of [...teamManagers, ...personalManagers]) {
    byId.set(row.id, row);
  }

  return [...byId.values()].sort((a, b) =>
    (a.displayName ?? a.username).localeCompare(b.displayName ?? b.username),
  );
}

export async function aggregateGlobalBattingByCharAndManager(
  charId: string,
): Promise<{ managerUserId: string; username: string; line: BattingLine }[]> {
  const leagueRows = await db
    .select({
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
    .innerJoin(users, eq(teams.managerUserId, users.id))
    .where(
      and(eq(characterGameStats.charId, charId), sql`${teams.managerUserId} IS NOT NULL`),
    )
    .groupBy(teams.managerUserId, users.username);

  const personalRows = await db
    .select({
      managerUserId: managerPersonalCharacterStats.managerUserId,
      username: users.username,
      games: sql<number>`count(distinct ${managerPersonalCharacterStats.personalGameId})`.mapWith(
        Number,
      ),
      ab: sql<number>`sum(${managerPersonalCharacterStats.ab})`.mapWith(Number),
      hits: sql<number>`sum(${managerPersonalCharacterStats.hits})`.mapWith(Number),
      singles: sql<number>`sum(${managerPersonalCharacterStats.singles})`.mapWith(Number),
      doubles: sql<number>`sum(${managerPersonalCharacterStats.doubles})`.mapWith(Number),
      triples: sql<number>`sum(${managerPersonalCharacterStats.triples})`.mapWith(Number),
      hr: sql<number>`sum(${managerPersonalCharacterStats.hr})`.mapWith(Number),
      walks4ball: sql<number>`sum(${managerPersonalCharacterStats.walks4ball})`.mapWith(Number),
      walksHbp: sql<number>`sum(${managerPersonalCharacterStats.walksHbp})`.mapWith(Number),
      sacFly: sql<number>`sum(${managerPersonalCharacterStats.sacFly})`.mapWith(Number),
      rbi: sql<number>`sum(${managerPersonalCharacterStats.rbi})`.mapWith(Number),
    })
    .from(managerPersonalCharacterStats)
    .innerJoin(users, eq(managerPersonalCharacterStats.managerUserId, users.id))
    .where(eq(managerPersonalCharacterStats.charId, charId))
    .groupBy(managerPersonalCharacterStats.managerUserId, users.username);

  const byManager = new Map<string, { username: string; line: BattingLine }>();

  for (const row of leagueRows) {
    if (!row.managerUserId) continue;
    byManager.set(row.managerUserId, {
      username: row.username,
      line: toBattingLine(charId, 0, row),
    });
  }

  for (const row of personalRows) {
    const existing = byManager.get(row.managerUserId);
    const line = toBattingLine(charId, 0, row);
    if (!existing) {
      byManager.set(row.managerUserId, { username: row.username, line });
      continue;
    }
    const totals = {
      games: existing.line.games + line.games,
      ab: existing.line.ab + line.ab,
      hits: existing.line.hits + line.hits,
      singles: existing.line.singles + line.singles,
      doubles: existing.line.doubles + line.doubles,
      triples: existing.line.triples + line.triples,
      hr: existing.line.hr + line.hr,
      walks4ball: existing.line.walks4ball + line.walks4ball,
      walksHbp: existing.line.walksHbp + line.walksHbp,
      sacFly: existing.line.sacFly + line.sacFly,
      rbi: existing.line.rbi + line.rbi,
    };
    byManager.set(row.managerUserId, {
      username: row.username,
      line: toBattingLine(charId, 0, totals),
    });
  }

  return [...byManager.entries()]
    .map(([managerUserId, row]) => ({
      managerUserId,
      username: row.username,
      line: row.line,
    }))
    .sort((a, b) => b.line.ab - a.line.ab);
}

export type GlobalSeasonStatRow = {
  key: string;
  label: string;
  line: BattingLine;
};

export type GlobalSeasonPitchingRow = {
  key: string;
  label: string;
  line: PitchingLine;
};

export async function aggregateGlobalBattingByCharAndSeason(
  charId: string,
): Promise<GlobalSeasonStatRow[]> {
  const leagueRows = await db
    .select({
      seasonId: seasons.id,
      seasonName: seasons.name,
      leagueName: leagues.name,
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
    .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
    .where(eq(characterGameStats.charId, charId))
    .groupBy(seasons.id, seasons.name, leagues.name, seasons.createdAt)
    .orderBy(asc(seasons.createdAt));

  const personalRows = await db
    .select({
      games: sql<number>`count(distinct ${managerPersonalCharacterStats.personalGameId})`.mapWith(
        Number,
      ),
      ab: sql<number>`sum(${managerPersonalCharacterStats.ab})`.mapWith(Number),
      hits: sql<number>`sum(${managerPersonalCharacterStats.hits})`.mapWith(Number),
      singles: sql<number>`sum(${managerPersonalCharacterStats.singles})`.mapWith(Number),
      doubles: sql<number>`sum(${managerPersonalCharacterStats.doubles})`.mapWith(Number),
      triples: sql<number>`sum(${managerPersonalCharacterStats.triples})`.mapWith(Number),
      hr: sql<number>`sum(${managerPersonalCharacterStats.hr})`.mapWith(Number),
      walks4ball: sql<number>`sum(${managerPersonalCharacterStats.walks4ball})`.mapWith(Number),
      walksHbp: sql<number>`sum(${managerPersonalCharacterStats.walksHbp})`.mapWith(Number),
      sacFly: sql<number>`sum(${managerPersonalCharacterStats.sacFly})`.mapWith(Number),
      rbi: sql<number>`sum(${managerPersonalCharacterStats.rbi})`.mapWith(Number),
    })
    .from(managerPersonalCharacterStats)
    .innerJoin(
      managerPersonalGames,
      eq(managerPersonalCharacterStats.personalGameId, managerPersonalGames.id),
    )
    .where(eq(managerPersonalCharacterStats.charId, charId));

  const rows: GlobalSeasonStatRow[] = leagueRows.map((row) => ({
    key: row.seasonId,
    label: `${row.leagueName} · ${row.seasonName}`,
    line: toBattingLine(charId, 0, row),
  }));

  if (personalRows[0] && personalRows[0].ab > 0) {
    rows.push({
      key: "friendlies",
      label: "Friendlies",
      line: toBattingLine(charId, 0, personalRows[0]),
    });
  }

  return rows;
}

export async function aggregateGlobalPitchingByCharAndSeason(
  charId: string,
): Promise<GlobalSeasonPitchingRow[]> {
  const leagueRows = await db
    .select({
      seasonId: seasons.id,
      seasonName: seasons.name,
      leagueName: leagues.name,
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
      outsPitched: sql<number>`sum(${characterGameStats.outsPitched})`.mapWith(Number),
      battersFaced: sql<number>`sum(${characterGameStats.battersFaced})`.mapWith(Number),
      hitsAllowed: sql<number>`sum(${characterGameStats.hitsAllowed})`.mapWith(Number),
      runsAllowed: sql<number>`sum(${characterGameStats.runsAllowed})`.mapWith(Number),
      earnedRuns: sql<number>`sum(${characterGameStats.earnedRuns})`.mapWith(Number),
      walks: sql<number>`sum(${characterGameStats.pitchingWalks} + ${characterGameStats.battersHit})`.mapWith(Number),
      strikeouts: sql<number>`sum(${characterGameStats.strikeoutsDef})`.mapWith(Number),
      hrAllowed: sql<number>`sum(${characterGameStats.hrAllowed})`.mapWith(Number),
      pitchesThrown: sql<number>`sum(${characterGameStats.pitchesThrown})`.mapWith(Number),
    })
    .from(characterGameStats)
    .innerJoin(seasons, eq(characterGameStats.seasonId, seasons.id))
    .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
    .where(eq(characterGameStats.charId, charId))
    .groupBy(seasons.id, seasons.name, leagues.name, seasons.createdAt)
    .orderBy(asc(seasons.createdAt));

  const personalRows = await db
    .select({
      games: sql<number>`count(distinct case when ${managerPersonalCharacterStats.outsPitched} > 0 or ${managerPersonalCharacterStats.battersFaced} > 0 then ${managerPersonalCharacterStats.personalGameId} end)`.mapWith(
        Number,
      ),
      outsPitched: sql<number>`sum(${managerPersonalCharacterStats.outsPitched})`.mapWith(Number),
      battersFaced: sql<number>`sum(${managerPersonalCharacterStats.battersFaced})`.mapWith(Number),
      hitsAllowed: sql<number>`sum(${managerPersonalCharacterStats.hitsAllowed})`.mapWith(Number),
      runsAllowed: sql<number>`sum(${managerPersonalCharacterStats.runsAllowed})`.mapWith(Number),
      earnedRuns: sql<number>`sum(${managerPersonalCharacterStats.earnedRuns})`.mapWith(Number),
      walks: sql<number>`sum(${managerPersonalCharacterStats.pitchingWalks})`.mapWith(Number),
      strikeouts: sql<number>`sum(${managerPersonalCharacterStats.strikeoutsDef})`.mapWith(Number),
      hrAllowed: sql<number>`sum(${managerPersonalCharacterStats.hrAllowed})`.mapWith(Number),
      pitchesThrown: sql<number>`sum(${managerPersonalCharacterStats.pitchesThrown})`.mapWith(
        Number,
      ),
    })
    .from(managerPersonalCharacterStats)
    .where(eq(managerPersonalCharacterStats.charId, charId));

  const rows: GlobalSeasonPitchingRow[] = leagueRows
    .filter((row) => row.outsPitched > 0 || row.battersFaced > 0)
    .map((row) => ({
      key: row.seasonId,
      label: `${row.leagueName} · ${row.seasonName}`,
      line: toPitchingLine(charId, 0, row),
    }));

  const personal = personalRows[0];
  if (personal && (personal.outsPitched > 0 || personal.battersFaced > 0)) {
    rows.push({
      key: "friendlies",
      label: "Friendlies",
      line: toPitchingLine(charId, 0, personal),
    });
  }

  return rows;
}
