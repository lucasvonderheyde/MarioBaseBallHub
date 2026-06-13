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
import {
  mergePositionMaps,
  primaryFieldingPosition,
  type FieldingByPosition,
  type FieldingPositionMap,
} from "@/domain/stats/fielding-by-position";
import { normalizeStadiumId, stadiumIdVariants } from "@/domain/stats/stadium-id";

export type BattingLine = BattingTotals & {
  charId: string;
  charOccurrenceIndex: number;
  ba: number | null;
  obp: number | null;
  slg: number | null;
  longestHrDistance: number | null;
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
    longestHrDistance: null,
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
    longestHrDistance?: number | null;
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
    longestHrDistance: row.longestHrDistance ?? null,
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
    conditions.push(
      inArray(scheduleGames.statsStadiumId, stadiumIdVariants(filter.stadiumId)),
    );
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
      longestHrDistance: sql<number | null>`max(${characterGameStats.longestHrDistance})`.mapWith(
        Number,
      ),
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
    conditions.push(
      inArray(scheduleGames.statsStadiumId, stadiumIdVariants(filter.stadiumId)),
    );
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
      longestHrDistance: sql<number | null>`max(${characterGameStats.longestHrDistance})`.mapWith(
        Number,
      ),
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

export type PitchingLine = {
  charId: string;
  charOccurrenceIndex: number;
  games: number;
  gamesStarted: number;
  reliefAppearances: number;
  outsPitched: number;
  battersFaced: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  hrAllowed: number;
  pitchesThrown: number;
};

export function pitchingStatKey(charId: string, charOccurrenceIndex: number): string {
  return `${charId}\0${charOccurrenceIndex}`;
}

const pitchedInGame = sql`(${characterGameStats.wasPitcher} = 1 OR ${characterGameStats.outsPitched} > 0 OR ${characterGameStats.battersFaced} > 0)`;

function toPitchingLine(
  charId: string,
  charOccurrenceIndex: number,
  row: {
    games: number;
    gamesStarted?: number;
    reliefAppearances?: number;
    outsPitched: number;
    battersFaced: number;
    hitsAllowed: number;
    runsAllowed: number;
    earnedRuns: number;
    walks: number;
    strikeouts: number;
    hrAllowed: number;
    pitchesThrown: number;
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

async function buildStatConditions(filter: StatFilter) {
  const conditions = [seasonFilter(filter), pitchedInGame];
  if (filter.teamId) conditions.push(eq(characterGameStats.teamId, filter.teamId));
  if (filter.charId) conditions.push(eq(characterGameStats.charId, filter.charId));
  if (filter.managerUserId) {
    conditions.push(eq(teams.managerUserId, filter.managerUserId));
  }
  if (filter.stadiumId) {
    conditions.push(
      inArray(scheduleGames.statsStadiumId, stadiumIdVariants(filter.stadiumId)),
    );
  }
  if (filter.leagueId && !filter.seasonId) {
    const seasonIds = await getSeasonIdsForLeague(filter.leagueId);
    if (seasonIds.length === 0) return null;
    conditions.push(inArray(characterGameStats.seasonId, seasonIds));
  }
  return conditions;
}

export async function aggregatePitchingByCharOccurrence(
  filter: StatFilter,
): Promise<Map<string, PitchingLine>> {
  const conditions = await buildStatConditions(filter);
  if (!conditions) return new Map();

  const rows = await db
    .select({
      charId: characterGameStats.charId,
      charOccurrenceIndex: characterGameStats.charOccurrenceIndex,
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
      gamesStarted: sql<number>`sum(case when ${characterGameStats.pitchingRole} = 'starter' then 1 else 0 end)`.mapWith(Number),
      reliefAppearances: sql<number>`sum(case when ${characterGameStats.pitchingRole} = 'reliever' then 1 else 0 end)`.mapWith(Number),
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
    .where(and(...conditions))
    .groupBy(characterGameStats.charId, characterGameStats.charOccurrenceIndex);

  const map = new Map<string, PitchingLine>();
  for (const row of rows) {
    map.set(
      pitchingStatKey(row.charId, row.charOccurrenceIndex),
      toPitchingLine(row.charId, row.charOccurrenceIndex, row),
    );
  }
  return map;
}

export async function aggregatePitchingByCharId(
  filter: StatFilter,
): Promise<Map<string, PitchingLine>> {
  const conditions = await buildStatConditions(filter);
  if (!conditions) return new Map();

  const rows = await db
    .select({
      charId: characterGameStats.charId,
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
      gamesStarted: sql<number>`sum(case when ${characterGameStats.pitchingRole} = 'starter' then 1 else 0 end)`.mapWith(Number),
      reliefAppearances: sql<number>`sum(case when ${characterGameStats.pitchingRole} = 'reliever' then 1 else 0 end)`.mapWith(Number),
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
    .where(and(...conditions))
    .groupBy(characterGameStats.charId);

  const map = new Map<string, PitchingLine>();
  for (const row of rows) {
    map.set(row.charId, toPitchingLine(row.charId, 0, row));
  }
  return map;
}

export async function aggregatePitchingByCharAndSeason(
  charId: string,
  leagueId: string,
): Promise<{ seasonId: string; seasonName: string; line: PitchingLine }[]> {
  const rows = await db
    .select({
      seasonId: seasons.id,
      seasonName: seasons.name,
      games: sql<number>`count(distinct ${characterGameStats.gameId})`.mapWith(Number),
      gamesStarted: sql<number>`sum(case when ${characterGameStats.pitchingRole} = 'starter' then 1 else 0 end)`.mapWith(Number),
      reliefAppearances: sql<number>`sum(case when ${characterGameStats.pitchingRole} = 'reliever' then 1 else 0 end)`.mapWith(Number),
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
    .where(
      and(eq(characterGameStats.charId, charId), eq(seasons.leagueId, leagueId), pitchedInGame),
    )
    .groupBy(seasons.id, seasons.name)
    .orderBy(asc(seasons.createdAt));

  return rows.map((row) => ({
    seasonId: row.seasonId,
    seasonName: row.seasonName,
    line: toPitchingLine(charId, 0, row),
  }));
}

export type FieldingLine = {
  charId: string;
  charOccurrenceIndex: number;
  games: number;
  outs: number;
  bigPlays: number;
  battersInField: number;
  outsByPosition: FieldingPositionMap;
  battersByPosition: FieldingPositionMap;
  primaryPosition: ReturnType<typeof primaryFieldingPosition>;
};

export function emptyFieldingLine(charId: string): FieldingLine {
  return {
    charId,
    charOccurrenceIndex: 0,
    games: 0,
    outs: 0,
    bigPlays: 0,
    battersInField: 0,
    outsByPosition: {},
    battersByPosition: {},
    primaryPosition: null,
  };
}

export function getFieldingLine(
  map: Map<string, FieldingLine>,
  charId: string,
): FieldingLine {
  return map.get(charId) ?? emptyFieldingLine(charId);
}

function parseFieldingJson(raw: string | null): FieldingByPosition | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FieldingByPosition;
  } catch {
    return null;
  }
}

function toFieldingLine(
  charId: string,
  charOccurrenceIndex: number,
  row: {
    games: number;
    outs: number;
    bigPlays: number;
    battersInField: number;
    outsByPosition: FieldingPositionMap;
    battersByPosition: FieldingPositionMap;
  },
): FieldingLine {
  return {
    charId,
    charOccurrenceIndex,
    games: row.games,
    outs: row.outs,
    bigPlays: row.bigPlays,
    battersInField: row.battersInField,
    outsByPosition: row.outsByPosition,
    battersByPosition: row.battersByPosition,
    primaryPosition: primaryFieldingPosition(row.battersByPosition),
  };
}

const appearedInField = sql`(${characterGameStats.fieldingOuts} > 0 OR ${characterGameStats.fieldingBatters} > 0)`;

async function buildFieldingStatConditions(filter: StatFilter) {
  const conditions = [seasonFilter(filter), appearedInField];
  if (filter.teamId) conditions.push(eq(characterGameStats.teamId, filter.teamId));
  if (filter.charId) conditions.push(eq(characterGameStats.charId, filter.charId));
  if (filter.managerUserId) {
    conditions.push(eq(teams.managerUserId, filter.managerUserId));
  }
  if (filter.leagueId && !filter.seasonId) {
    const seasonIds = await getSeasonIdsForLeague(filter.leagueId);
    if (seasonIds.length === 0) return null;
    conditions.push(inArray(characterGameStats.seasonId, seasonIds));
  }
  return conditions;
}

async function aggregateFieldingRows(filter: StatFilter) {
  const conditions = await buildFieldingStatConditions(filter);
  if (!conditions) return [];

  return db
    .select({
      charId: characterGameStats.charId,
      charOccurrenceIndex: characterGameStats.charOccurrenceIndex,
      gameId: characterGameStats.gameId,
      fieldingOuts: characterGameStats.fieldingOuts,
      fieldingBatters: characterGameStats.fieldingBatters,
      bigPlays: characterGameStats.bigPlays,
      fieldingByPositionJson: characterGameStats.fieldingByPositionJson,
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .innerJoin(teams, eq(characterGameStats.teamId, teams.id))
    .where(and(...conditions));
}

function foldFieldingRows(
  rows: Awaited<ReturnType<typeof aggregateFieldingRows>>,
): Map<string, FieldingLine> {
  const grouped = new Map<
    string,
    {
      charId: string;
      charOccurrenceIndex: number;
      gameIds: Set<string>;
      outs: number;
      bigPlays: number;
      battersInField: number;
      outsByPosition: FieldingPositionMap;
      battersByPosition: FieldingPositionMap;
    }
  >();

  for (const row of rows) {
    const key = battingStatKey(row.charId, row.charOccurrenceIndex);
    const parsed = parseFieldingJson(row.fieldingByPositionJson);
    const current = grouped.get(key) ?? {
      charId: row.charId,
      charOccurrenceIndex: row.charOccurrenceIndex,
      gameIds: new Set<string>(),
      outs: 0,
      bigPlays: 0,
      battersInField: 0,
      outsByPosition: {},
      battersByPosition: {},
    };

    current.gameIds.add(row.gameId);
    current.outs += row.fieldingOuts;
    current.bigPlays += row.bigPlays;
    current.battersInField += row.fieldingBatters;
    if (parsed) {
      current.outsByPosition = mergePositionMaps(
        current.outsByPosition,
        parsed.outs,
      );
      current.battersByPosition = mergePositionMaps(
        current.battersByPosition,
        parsed.batters,
      );
    }

    grouped.set(key, current);
  }

  const map = new Map<string, FieldingLine>();
  for (const entry of grouped.values()) {
    map.set(
      battingStatKey(entry.charId, entry.charOccurrenceIndex),
      toFieldingLine(entry.charId, entry.charOccurrenceIndex, {
        games: entry.gameIds.size,
        outs: entry.outs,
        bigPlays: entry.bigPlays,
        battersInField: entry.battersInField,
        outsByPosition: entry.outsByPosition,
        battersByPosition: entry.battersByPosition,
      }),
    );
  }
  return map;
}

export async function aggregateFieldingByCharOccurrence(
  filter: StatFilter,
): Promise<Map<string, FieldingLine>> {
  const rows = await aggregateFieldingRows(filter);
  return foldFieldingRows(rows);
}

export async function aggregateFieldingByCharId(
  filter: StatFilter,
): Promise<Map<string, FieldingLine>> {
  const byOccurrence = await aggregateFieldingByCharOccurrence(filter);
  const merged = new Map<string, FieldingLine>();

  for (const line of byOccurrence.values()) {
    const existing = merged.get(line.charId);
    if (!existing) {
      merged.set(line.charId, { ...line, charOccurrenceIndex: 0 });
      continue;
    }

    merged.set(line.charId, toFieldingLine(line.charId, 0, {
      games: existing.games + line.games,
      outs: existing.outs + line.outs,
      bigPlays: existing.bigPlays + line.bigPlays,
      battersInField: existing.battersInField + line.battersInField,
      outsByPosition: mergePositionMaps(existing.outsByPosition, line.outsByPosition),
      battersByPosition: mergePositionMaps(
        existing.battersByPosition,
        line.battersByPosition,
      ),
    }));
  }

  return merged;
}

export async function aggregateFieldingByCharAndSeason(
  charId: string,
  leagueId: string,
): Promise<{ seasonId: string; seasonName: string; line: FieldingLine }[]> {
  const rows = await db
    .select({
      seasonId: seasons.id,
      seasonName: seasons.name,
      charId: characterGameStats.charId,
      charOccurrenceIndex: characterGameStats.charOccurrenceIndex,
      gameId: characterGameStats.gameId,
      fieldingOuts: characterGameStats.fieldingOuts,
      fieldingBatters: characterGameStats.fieldingBatters,
      bigPlays: characterGameStats.bigPlays,
      fieldingByPositionJson: characterGameStats.fieldingByPositionJson,
    })
    .from(characterGameStats)
    .innerJoin(seasons, eq(characterGameStats.seasonId, seasons.id))
    .where(
      and(
        eq(characterGameStats.charId, charId),
        eq(seasons.leagueId, leagueId),
        appearedInField,
      ),
    )
    .orderBy(asc(seasons.createdAt));

  const bySeason = new Map<
    string,
    {
      seasonName: string;
      rows: typeof rows;
    }
  >();

  for (const row of rows) {
    const bucket = bySeason.get(row.seasonId) ?? {
      seasonName: row.seasonName,
      rows: [],
    };
    bucket.rows.push(row);
    bySeason.set(row.seasonId, bucket);
  }

  return [...bySeason.entries()].map(([seasonId, bucket]) => {
    const folded = foldFieldingRows(bucket.rows);
    let line = emptyFieldingLine(charId);
    for (const entry of folded.values()) {
      if (entry.charId !== charId) continue;
      line = toFieldingLine(charId, 0, {
        games: line.games + entry.games,
        outs: line.outs + entry.outs,
        bigPlays: line.bigPlays + entry.bigPlays,
        battersInField: line.battersInField + entry.battersInField,
        outsByPosition: mergePositionMaps(line.outsByPosition, entry.outsByPosition),
        battersByPosition: mergePositionMaps(
          line.battersByPosition,
          entry.battersByPosition,
        ),
      });
    }
    return { seasonId, seasonName: bucket.seasonName, line };
  });
}

/**
 * Characters who played for this team in uploaded games but left before the most recent
 * game and are not on the admin roster. Walks games in chronological order so active
 * roster members are not misclassified when occurrence indexes differ from copy indexes.
 */
export async function getFormerRosterCharIds(
  seasonId: string,
  teamId: string,
  currentRosterCharIds: ReadonlySet<string>,
): Promise<Set<string>> {
  const rows = await db
    .select({
      gameId: scheduleGames.id,
      charId: characterGameStats.charId,
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .where(
      and(
        eq(characterGameStats.seasonId, seasonId),
        eq(characterGameStats.teamId, teamId),
        sql`${scheduleGames.statsRawJson} IS NOT NULL`,
      ),
    )
    .orderBy(asc(scheduleGames.playedAt), asc(scheduleGames.id), asc(characterGameStats.rosterSlot));

  const orderedGameIds: string[] = [];
  const seenGames = new Set<string>();
  const charsByGame = new Map<string, Set<string>>();
  const everAppeared = new Set<string>();

  for (const row of rows) {
    everAppeared.add(row.charId);
    let gameChars = charsByGame.get(row.gameId);
    if (!gameChars) {
      gameChars = new Set();
      charsByGame.set(row.gameId, gameChars);
    }
    gameChars.add(row.charId);
    if (!seenGames.has(row.gameId)) {
      seenGames.add(row.gameId);
      orderedGameIds.push(row.gameId);
    }
  }

  const lastGameId = orderedGameIds[orderedGameIds.length - 1];
  const lastGameCharIds = lastGameId
    ? (charsByGame.get(lastGameId) ?? new Set<string>())
    : new Set<string>();

  const former = new Set<string>();
  for (const charId of everAppeared) {
    if (currentRosterCharIds.has(charId)) continue;
    if (lastGameCharIds.has(charId)) continue;
    former.add(charId);
  }
  return former;
}

/** Season totals for characters who truly left this team (see getFormerRosterCharIds). */
export async function aggregateFormerRosterTeamStats(
  seasonId: string,
  teamId: string,
  currentRosterCharIds: ReadonlySet<string>,
): Promise<{
  charIds: Set<string>;
  batting: Map<string, BattingLine>;
  pitching: Map<string, PitchingLine>;
}> {
  const formerCharIds = await getFormerRosterCharIds(
    seasonId,
    teamId,
    currentRosterCharIds,
  );
  if (formerCharIds.size === 0) {
    return { charIds: formerCharIds, batting: new Map(), pitching: new Map() };
  }

  const [battingAll, pitchingAll] = await Promise.all([
    aggregateBattingByCharId({ seasonId, teamId }),
    aggregatePitchingByCharId({ seasonId, teamId }),
  ]);

  const batting = new Map<string, BattingLine>();
  const pitching = new Map<string, PitchingLine>();

  for (const charId of formerCharIds) {
    const battingLine = battingAll.get(charId);
    if (battingLine && (battingLine.ab > 0 || battingLine.games > 0)) {
      batting.set(charId, battingLine);
    }
    const pitchingLine = pitchingAll.get(charId);
    if (
      pitchingLine &&
      (pitchingLine.outsPitched > 0 ||
        pitchingLine.battersFaced > 0 ||
        pitchingLine.games > 0)
    ) {
      pitching.set(charId, pitchingLine);
    }
  }

  return { charIds: formerCharIds, batting, pitching };
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
      longestHrDistance: sql<number | null>`max(${characterGameStats.longestHrDistance})`.mapWith(
        Number,
      ),
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
      longestHrDistance: sql<number | null>`max(${characterGameStats.longestHrDistance})`.mapWith(
        Number,
      ),
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
    sql`${scheduleGames.statsRawJson} IS NOT NULL`,
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
      longestHrDistance: sql<number | null>`max(${characterGameStats.longestHrDistance})`.mapWith(
        Number,
      ),
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .innerJoin(seasons, eq(characterGameStats.seasonId, seasons.id))
    .where(and(...conditions))
    .groupBy(scheduleGames.statsStadiumId);

  const merged = rows
    .filter((r): r is typeof r & { stadiumId: string } => r.stadiumId != null)
    .reduce(
      (acc, row) => {
        const canonicalId = normalizeStadiumId(row.stadiumId)!;
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
        const existing = acc.get(canonicalId);
        if (!existing) {
          acc.set(canonicalId, {
            totals,
            longestHrDistance: row.longestHrDistance ?? null,
          });
          return acc;
        }
        acc.set(canonicalId, {
          totals: sumBattingTotals([existing.totals, totals]),
          longestHrDistance:
            existing.longestHrDistance != null || row.longestHrDistance != null
              ? Math.max(existing.longestHrDistance ?? 0, row.longestHrDistance ?? 0)
              : null,
        });
        return acc;
      },
      new Map<string, { totals: BattingTotals; longestHrDistance: number | null }>(),
    );

  return [...merged.entries()].map(([stadiumId, entry]) => ({
    stadiumId,
    line: toBattingLine(charId, 0, {
      ...entry.totals,
      longestHrDistance: entry.longestHrDistance,
    }),
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
    if (!r.stadiumId) continue;
    const canonicalId = normalizeStadiumId(r.stadiumId)!;
    map.set(canonicalId, (map.get(canonicalId) ?? 0) + r.count);
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
    inArray(scheduleGames.statsStadiumId, stadiumIdVariants(stadiumGameId)),
    eq(seasons.leagueId, leagueId),
    sql`${scheduleGames.statsRawJson} IS NOT NULL`,
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
    inArray(scheduleGames.statsStadiumId, stadiumIdVariants(stadiumGameId)),
    eq(seasons.leagueId, leagueId),
    sql`${scheduleGames.playedAt} IS NOT NULL`,
    sql`${scheduleGames.statsRawJson} IS NOT NULL`,
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
