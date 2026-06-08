import crypto from "crypto";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { characterGameStats, rounds, scheduleGames } from "@/db/schema";
import { parseCharacterGameStats } from "@/domain/stats/parse-character-game-stats";

function newId(): string {
  return crypto.randomUUID();
}

export type PersistGameStatsInput = {
  gameId: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
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
    teamId: s.teamSide === "Away" ? input.awayTeamId : input.homeTeamId,
    teamSide: s.teamSide,
    rosterSlot: s.rosterSlot,
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
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      rawJson: g.statsRawJson,
    });
    count++;
  }
  return count;
}

export async function deleteCharacterGameStatsForGame(gameId: string): Promise<void> {
  await db.delete(characterGameStats).where(eq(characterGameStats.gameId, gameId));
}
