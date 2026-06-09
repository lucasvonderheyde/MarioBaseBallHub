import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  leagueMembers,
  leagues,
  rosterInstances,
  rounds,
  scheduleGames,
  seasonCharacterPool,
  seasons,
  teams,
} from "@/db/schema";

export type LeagueBackup = {
  version: 1;
  exportedAt: string;
  league: typeof leagues.$inferSelect;
  members: (typeof leagueMembers.$inferSelect)[];
  seasons: Array<{
    season: typeof seasons.$inferSelect;
    teams: (typeof teams.$inferSelect)[];
    characterPool: (typeof seasonCharacterPool.$inferSelect)[];
    rosterInstances: (typeof rosterInstances.$inferSelect)[];
    rounds: (typeof rounds.$inferSelect)[];
    games: (typeof scheduleGames.$inferSelect)[];
  }>;
};

export async function exportLeagueBackup(leagueId: string): Promise<LeagueBackup | null> {
  const [league] = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league) return null;

  const members = await db
    .select()
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId));

  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const seasonIds = seasonRows.map((season) => season.id);
  if (seasonIds.length === 0) {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      league,
      members,
      seasons: [],
    };
  }

  const teamRows = await db
    .select()
    .from(teams)
    .where(inArray(teams.seasonId, seasonIds));
  const poolRows = await db
    .select()
    .from(seasonCharacterPool)
    .where(inArray(seasonCharacterPool.seasonId, seasonIds));
  const rosterRows = await db
    .select()
    .from(rosterInstances)
    .where(inArray(rosterInstances.seasonId, seasonIds));
  const roundRows = await db
    .select()
    .from(rounds)
    .where(inArray(rounds.seasonId, seasonIds));

  const roundIds = roundRows.map((round) => round.id);
  const gameRows =
    roundIds.length > 0
      ? await db
          .select()
          .from(scheduleGames)
          .where(inArray(scheduleGames.roundId, roundIds))
      : [];

  const teamsBySeason = groupBy(teamRows, (row) => row.seasonId);
  const poolBySeason = groupBy(poolRows, (row) => row.seasonId);
  const rosterBySeason = groupBy(rosterRows, (row) => row.seasonId);
  const roundsBySeason = groupBy(roundRows, (row) => row.seasonId);
  const gamesByRound = groupBy(gameRows, (row) => row.roundId);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    league,
    members,
    seasons: seasonRows.map((season) => ({
      season,
      teams: teamsBySeason.get(season.id) ?? [],
      characterPool: poolBySeason.get(season.id) ?? [],
      rosterInstances: rosterBySeason.get(season.id) ?? [],
      rounds: roundsBySeason.get(season.id) ?? [],
      games: (roundsBySeason.get(season.id) ?? []).flatMap(
        (round) => gamesByRound.get(round.id) ?? [],
      ),
    })),
  };
}

function groupBy<T, K extends string | number>(
  rows: T[],
  keyFn: (row: T) => K,
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const group = map.get(key);
    if (group) group.push(row);
    else map.set(key, [row]);
  }
  return map;
}

export async function importLeagueBackup(backup: LeagueBackup): Promise<string> {
  if (backup.version !== 1) {
    throw new Error("Unsupported backup version.");
  }

  const [existing] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.id, backup.league.id))
    .limit(1);
  if (existing) {
    throw new Error("A league with this id already exists. Delete it first or edit the backup.");
  }

  await db.transaction(async (tx) => {
    await tx.insert(leagues).values(backup.league);
    if (backup.members.length > 0) {
      await tx.insert(leagueMembers).values(backup.members);
    }
    for (const seasonBlock of backup.seasons) {
      await tx.insert(seasons).values(seasonBlock.season);
      if (seasonBlock.teams.length > 0) {
        await tx.insert(teams).values(seasonBlock.teams);
      }
      if (seasonBlock.characterPool.length > 0) {
        await tx.insert(seasonCharacterPool).values(seasonBlock.characterPool);
      }
      if (seasonBlock.rosterInstances.length > 0) {
        await tx.insert(rosterInstances).values(seasonBlock.rosterInstances);
      }
      if (seasonBlock.rounds.length > 0) {
        await tx.insert(rounds).values(seasonBlock.rounds);
      }
      if (seasonBlock.games.length > 0) {
        await tx.insert(scheduleGames).values(seasonBlock.games);
      }
    }
  });

  return backup.league.id;
}
