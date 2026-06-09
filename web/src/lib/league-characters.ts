import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { characters, seasonCharacterPool, seasons } from "@/db/schema";
import { getSeasonIdsForLeague } from "@/lib/game-stats-queries";

export type LeagueCharacterEntry = {
  gameCharId: string;
  displayName: string;
  mugshotFile: string | null;
  leagueCopies: number;
  active: boolean;
};

export async function getLeagueCharacterLibrary(
  leagueId: string,
  seasonId?: string,
): Promise<{ active: LeagueCharacterEntry[]; inactive: LeagueCharacterEntry[] }> {
  const allChars = await db
    .select()
    .from(characters)
    .orderBy(asc(characters.displayName));

  const poolByCharacterId = new Map<string, number>();

  if (seasonId) {
    const poolRows = await db
      .select()
      .from(seasonCharacterPool)
      .where(eq(seasonCharacterPool.seasonId, seasonId));
    for (const row of poolRows) {
      poolByCharacterId.set(row.characterId, row.leagueCopies);
    }
  } else {
    const seasonIds = await getSeasonIdsForLeague(leagueId);
    if (seasonIds.length > 0) {
      const poolRows = await db
        .select()
        .from(seasonCharacterPool)
        .where(inArray(seasonCharacterPool.seasonId, seasonIds));
      for (const row of poolRows) {
        const current = poolByCharacterId.get(row.characterId) ?? 0;
        poolByCharacterId.set(row.characterId, Math.max(current, row.leagueCopies));
      }
    }
  }

  const entries: LeagueCharacterEntry[] = allChars.map((character) => {
    const leagueCopies = poolByCharacterId.get(character.id) ?? 0;
    return {
      gameCharId: character.gameCharId,
      displayName: character.displayName,
      mugshotFile: character.mugshotFile,
      leagueCopies,
      active: leagueCopies > 0,
    };
  });

  return {
    active: entries.filter((entry) => entry.active),
    inactive: entries.filter((entry) => !entry.active),
  };
}

export async function countPoolSeasonsForChar(
  gameCharId: string,
  leagueId: string,
): Promise<number> {
  const [character] = await db
    .select({ id: characters.id })
    .from(characters)
    .where(eq(characters.gameCharId, gameCharId))
    .limit(1);
  if (!character) return 0;

  const rows = await db
    .select({ seasonId: seasonCharacterPool.seasonId })
    .from(seasonCharacterPool)
    .innerJoin(seasons, eq(seasonCharacterPool.seasonId, seasons.id))
    .where(
      and(
        eq(seasonCharacterPool.characterId, character.id),
        eq(seasons.leagueId, leagueId),
        sql`${seasonCharacterPool.leagueCopies} > 0`,
      ),
    );

  return rows.length;
}
