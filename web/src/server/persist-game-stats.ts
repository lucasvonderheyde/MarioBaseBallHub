import crypto from "crypto";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { characterGameStats, rounds, scheduleGames } from "@/db/schema";
import {
  assignCharOccurrenceIndexes,
  parseCharacterGameStats,
} from "@/domain/stats/parse-character-game-stats";

function newId(): string {
  return crypto.randomUUID();
}

export type PersistGameStatsInput = {
  gameId: string;
  seasonId: string;
  /** Schedule team that should receive the file's Away-side roster stats. */
  awaySideTeamId: string;
  /** Schedule team that should receive the file's Home-side roster stats. */
  homeSideTeamId: string;
  rawJson: string;
};

/** Deletes existing parsed rows for a game and inserts fresh character stats. */
export async function persistCharacterGameStats(input: PersistGameStatsInput): Promise<void> {
  const data = JSON.parse(input.rawJson) as unknown;
  const parsed = parseCharacterGameStats(data);

  await db.delete(characterGameStats).where(eq(characterGameStats.gameId, input.gameId));

  const rows = parsed.characterStats.map((s) => ({
    id: newId(),
    gameId: input.gameId,
    seasonId: input.seasonId,
    teamId: s.teamSide === "Away" ? input.awaySideTeamId : input.homeSideTeamId,
    teamSide: s.teamSide,
    rosterSlot: s.rosterSlot,
    charOccurrenceIndex: s.charOccurrenceIndex,
    charId: s.charId,
    isCaptain: s.isCaptain,
    isSuperstar: s.isSuperstar,
    battingHand: s.battingHand,
    fieldingHand: s.fieldingHand,
    ab: s.ab,
    hits: s.hits,
    singles: s.singles,
    doubles: s.doubles,
    triples: s.triples,
    hr: s.hr,
    walks4ball: s.walks4ball,
    walksHbp: s.walksHbp,
    strikeoutsOff: s.strikeoutsOff,
    rbi: s.rbi,
    basesStolen: s.basesStolen,
    sacFly: s.sacFly,
    bunts: s.bunts,
    starHits: s.starHits,
    wasPitcher: s.wasPitcher,
    battersFaced: s.battersFaced,
    runsAllowed: s.runsAllowed,
    earnedRuns: s.earnedRuns,
    pitchingWalks: s.pitchingWalks,
    battersHit: s.battersHit,
    hitsAllowed: s.hitsAllowed,
    hrAllowed: s.hrAllowed,
    pitchesThrown: s.pitchesThrown,
    outsPitched: s.outsPitched,
    strikeoutsDef: s.strikeoutsDef,
    starPitches: s.starPitches,
    bigPlays: s.bigPlays,
  }));

  if (rows.length > 0) {
    await db.insert(characterGameStats).values(rows);
  }

  await db
    .update(scheduleGames)
    .set({ statsStadiumId: parsed.stadiumId })
    .where(eq(scheduleGames.id, input.gameId));
}

/** Recomputes occurrence indexes for rows already stored (e.g. after schema migration). */
export async function recomputeCharOccurrenceIndexesForGame(gameId: string): Promise<void> {
  const rows = await db
    .select({
      id: characterGameStats.id,
      teamSide: characterGameStats.teamSide,
      rosterSlot: characterGameStats.rosterSlot,
      charId: characterGameStats.charId,
    })
    .from(characterGameStats)
    .where(eq(characterGameStats.gameId, gameId))
    .orderBy(asc(characterGameStats.teamSide), asc(characterGameStats.rosterSlot));

  if (rows.length === 0) return;

  const withOccurrence = assignCharOccurrenceIndexes(rows);
  for (const row of withOccurrence) {
    await db
      .update(characterGameStats)
      .set({ charOccurrenceIndex: row.charOccurrenceIndex })
      .where(eq(characterGameStats.id, row.id));
  }
}

/** Backfill parsed stats for games that have raw JSON but no character_game_stats rows. */
export async function backfillCharacterGameStats(seasonId: string): Promise<number> {
  const unparsed = await db
    .select({
      id: scheduleGames.id,
      statsRawJson: scheduleGames.statsRawJson,
      homeTeamId: scheduleGames.homeTeamId,
      awayTeamId: scheduleGames.awayTeamId,
    })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .where(
      and(
        eq(rounds.seasonId, seasonId),
        isNotNull(scheduleGames.statsRawJson),
        sql`NOT EXISTS (SELECT 1 FROM character_game_stats cgs WHERE cgs.game_id = ${scheduleGames.id})`,
      ),
    );

  let count = 0;
  for (const g of unparsed) {
    if (!g.statsRawJson) continue;
    await persistCharacterGameStats({
      gameId: g.id,
      seasonId,
      awaySideTeamId: g.awayTeamId,
      homeSideTeamId: g.homeTeamId,
      rawJson: g.statsRawJson,
    });
    count++;
  }

  const parsedGames = await db
    .select({ id: scheduleGames.id })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .where(
      and(
        eq(rounds.seasonId, seasonId),
        isNotNull(scheduleGames.statsRawJson),
        sql`EXISTS (SELECT 1 FROM character_game_stats cgs WHERE cgs.game_id = ${scheduleGames.id})`,
      ),
    );

  for (const g of parsedGames) {
    await recomputeCharOccurrenceIndexesForGame(g.id);
  }

  await resyncStadiumIdsFromGameJson(seasonId);
  return count;
}

/** Re-reads StadiumID from stored game JSON so stadium pages stay aligned with uploads. */
export async function resyncStadiumIdsFromGameJson(seasonId: string): Promise<number> {
  const games = await db
    .select({
      id: scheduleGames.id,
      statsRawJson: scheduleGames.statsRawJson,
    })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .where(and(eq(rounds.seasonId, seasonId), isNotNull(scheduleGames.statsRawJson)));

  let count = 0;
  for (const game of games) {
    if (!game.statsRawJson) continue;
    const parsed = parseCharacterGameStats(JSON.parse(game.statsRawJson) as unknown);
    if (!parsed.stadiumId) continue;
    await db
      .update(scheduleGames)
      .set({ statsStadiumId: parsed.stadiumId })
      .where(eq(scheduleGames.id, game.id));
    count++;
  }
  return count;
}

export async function deleteCharacterGameStatsForGame(gameId: string): Promise<void> {
  await db.delete(characterGameStats).where(eq(characterGameStats.gameId, gameId));
}
