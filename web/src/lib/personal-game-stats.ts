import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  managerPersonalCharacterStats,
  managerPersonalGames,
  scheduleGames,
} from "@/db/schema";
import type { DecodedGameSummary } from "@/domain/stats/decode-game-file";
import {
  battingAverage,
  onBasePercentage,
  sluggingPercentage,
  type BattingTotals,
} from "@/domain/stats/batting-metrics";
import {
  parseCharacterGameStats,
  type ParsedCharacterGameStat,
} from "@/domain/stats/parse-character-game-stats";
import {
  toBattingLine,
  type BattingLine,
  type PitchingLine,
} from "@/lib/game-stats-queries";

function newId(): string {
  return crypto.randomUUID();
}

export type StoredStatsGameId =
  | { source: "none" }
  | { source: "schedule"; scheduleGameId: string }
  | { source: "personal"; personalGameId: string };

export async function findStoredStatsGameId(
  statsGameId: string,
): Promise<StoredStatsGameId> {
  const [scheduleRow] = await db
    .select({ id: scheduleGames.id })
    .from(scheduleGames)
    .where(eq(scheduleGames.statsGameId, statsGameId))
    .limit(1);
  if (scheduleRow) {
    return { source: "schedule", scheduleGameId: scheduleRow.id };
  }

  const [personalRow] = await db
    .select({ id: managerPersonalGames.id })
    .from(managerPersonalGames)
    .where(eq(managerPersonalGames.statsGameId, statsGameId))
    .limit(1);
  if (personalRow) {
    return { source: "personal", personalGameId: personalRow.id };
  }

  return { source: "none" };
}

export function duplicateStatsGameIdMessage(stored: StoredStatsGameId): string {
  if (stored.source === "schedule") {
    return "This GameID is already linked to a season game.";
  }
  if (stored.source === "personal") {
    return "This GameID is already in lifetime stats.";
  }
  return "";
}

function characterStatRow(
  personalGameId: string,
  managerUserId: string,
  stat: ParsedCharacterGameStat,
) {
  return {
    id: newId(),
    personalGameId,
    managerUserId,
    teamSide: stat.teamSide,
    rosterSlot: stat.rosterSlot,
    charOccurrenceIndex: stat.charOccurrenceIndex,
    charId: stat.charId,
    isCaptain: stat.isCaptain,
    isSuperstar: stat.isSuperstar,
    battingHand: stat.battingHand,
    fieldingHand: stat.fieldingHand,
    ab: stat.ab,
    hits: stat.hits,
    singles: stat.singles,
    doubles: stat.doubles,
    triples: stat.triples,
    hr: stat.hr,
    walks4ball: stat.walks4ball,
    walksHbp: stat.walksHbp,
    strikeoutsOff: stat.strikeoutsOff,
    rbi: stat.rbi,
    basesStolen: stat.basesStolen,
    sacFly: stat.sacFly,
    bunts: stat.bunts,
    starHits: stat.starHits,
    wasPitcher: stat.wasPitcher,
    battersFaced: stat.battersFaced,
    runsAllowed: stat.runsAllowed,
    earnedRuns: stat.earnedRuns,
    pitchingWalks: stat.pitchingWalks,
    battersHit: stat.battersHit,
    hitsAllowed: stat.hitsAllowed,
    hrAllowed: stat.hrAllowed,
    pitchesThrown: stat.pitchesThrown,
    outsPitched: stat.outsPitched,
    strikeoutsDef: stat.strikeoutsDef,
    starPitches: stat.starPitches,
    bigPlays: stat.bigPlays,
  };
}

export async function persistPersonalGameStats(input: {
  managerUserId: string;
  uploadedByUserId: string;
  teamSide: "Away" | "Home";
  parsed: DecodedGameSummary;
}): Promise<{ personalGameId: string }> {
  const characterStats = parseCharacterGameStats(JSON.parse(input.parsed.rawJson) as unknown);
  const personalGameId = newId();

  await db.insert(managerPersonalGames).values({
    id: personalGameId,
    statsGameId: input.parsed.statsGameId,
    uploadedByUserId: input.uploadedByUserId,
    managerUserId: input.managerUserId,
    teamSide: input.teamSide,
    awayPlayer: input.parsed.awayPlayer,
    homePlayer: input.parsed.homePlayer,
    awayScore: input.parsed.awayScore,
    homeScore: input.parsed.homeScore,
    stadiumId: input.parsed.stadiumId ?? null,
    statsRawJson: input.parsed.rawJson,
    playedAt: new Date(),
  });

  const sideStats = characterStats.characterStats.filter(
    (stat) => stat.teamSide === input.teamSide,
  );
  if (sideStats.length > 0) {
    await db.insert(managerPersonalCharacterStats).values(
      sideStats.map((stat) =>
        characterStatRow(personalGameId, input.managerUserId, stat),
      ),
    );
  }

  return { personalGameId };
}

export async function aggregatePersonalBattingByCharId(
  managerUserId: string,
): Promise<Map<string, BattingLine>> {
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
    .where(eq(managerPersonalCharacterStats.managerUserId, managerUserId))
    .groupBy(managerPersonalCharacterStats.charId);

  const map = new Map<string, BattingLine>();
  for (const row of rows) {
    map.set(row.charId, toBattingLine(row.charId, 0, row));
  }
  return map;
}

export async function aggregatePersonalPitchingByCharId(
  managerUserId: string,
): Promise<Map<string, PitchingLine>> {
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
    .where(eq(managerPersonalCharacterStats.managerUserId, managerUserId))
    .groupBy(managerPersonalCharacterStats.charId);

  const map = new Map<string, PitchingLine>();
  for (const row of rows) {
    if (row.outsPitched === 0 && row.battersFaced === 0 && row.games === 0) continue;
    map.set(row.charId, {
      charId: row.charId,
      charOccurrenceIndex: 0,
      games: row.games,
      gamesStarted: 0,
      reliefAppearances: 0,
      outsPitched: row.outsPitched,
      battersFaced: row.battersFaced,
      hitsAllowed: row.hitsAllowed,
      runsAllowed: row.runsAllowed,
      earnedRuns: row.earnedRuns,
      walks: row.walks,
      strikeouts: row.strikeouts,
      hrAllowed: row.hrAllowed,
      pitchesThrown: row.pitchesThrown,
    });
  }
  return map;
}

export function mergeBattingMaps(
  league: Map<string, BattingLine>,
  personal: Map<string, BattingLine>,
): Map<string, BattingLine> {
  const merged = new Map(league);
  for (const [charId, line] of personal) {
    const existing = merged.get(charId);
    if (!existing) {
      merged.set(charId, line);
      continue;
    }
    const totals: BattingTotals = {
      games: existing.games + line.games,
      ab: existing.ab + line.ab,
      hits: existing.hits + line.hits,
      singles: existing.singles + line.singles,
      doubles: existing.doubles + line.doubles,
      triples: existing.triples + line.triples,
      hr: existing.hr + line.hr,
      walks4ball: existing.walks4ball + line.walks4ball,
      walksHbp: existing.walksHbp + line.walksHbp,
      sacFly: existing.sacFly + line.sacFly,
      rbi: existing.rbi + line.rbi,
    };
    merged.set(charId, {
      charId,
      charOccurrenceIndex: 0,
      ...totals,
      ba: battingAverage(totals),
      obp: onBasePercentage(totals),
      slg: sluggingPercentage(totals),
      longestHrDistance:
        existing.longestHrDistance != null || line.longestHrDistance != null
          ? Math.max(existing.longestHrDistance ?? 0, line.longestHrDistance ?? 0)
          : null,
    });
  }
  return merged;
}

export function mergePitchingMaps(
  league: Map<string, PitchingLine>,
  personal: Map<string, PitchingLine>,
): Map<string, PitchingLine> {
  const merged = new Map(league);
  for (const [charId, line] of personal) {
    const existing = merged.get(charId);
    if (!existing) {
      merged.set(charId, line);
      continue;
    }
    merged.set(charId, {
      charId,
      charOccurrenceIndex: 0,
      games: existing.games + line.games,
      gamesStarted: existing.gamesStarted + line.gamesStarted,
      reliefAppearances: existing.reliefAppearances + line.reliefAppearances,
      outsPitched: existing.outsPitched + line.outsPitched,
      battersFaced: existing.battersFaced + line.battersFaced,
      hitsAllowed: existing.hitsAllowed + line.hitsAllowed,
      runsAllowed: existing.runsAllowed + line.runsAllowed,
      earnedRuns: existing.earnedRuns + line.earnedRuns,
      walks: existing.walks + line.walks,
      strikeouts: existing.strikeouts + line.strikeouts,
      hrAllowed: existing.hrAllowed + line.hrAllowed,
      pitchesThrown: existing.pitchesThrown + line.pitchesThrown,
    });
  }
  return merged;
}
