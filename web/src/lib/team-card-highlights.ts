import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { characterGameStats, scheduleGames } from "@/db/schema";

export type TeamCardHighlight = {
  hrLeader: { charId: string; hr: number } | null;
  recentStarter: { charId: string } | null;
  recentReliever: { charId: string } | null;
};

type SeasonGame = {
  game: {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    playedAt: Date | null;
    statsRawJson: string | null;
  };
};

const pitchedInGame = sql`(${characterGameStats.wasPitcher} = 1 OR ${characterGameStats.outsPitched} > 0 OR ${characterGameStats.battersFaced} > 0)`;

export async function getTeamCardHighlightsForSeason(
  seasonId: string,
  teamIds: string[],
  games: SeasonGame[],
): Promise<Map<string, TeamCardHighlight>> {
  const result = new Map<string, TeamCardHighlight>();
  for (const teamId of teamIds) {
    result.set(teamId, {
      hrLeader: null,
      recentStarter: null,
      recentReliever: null,
    });
  }
  if (teamIds.length === 0) return result;

  const hrRows = await db
    .select({
      teamId: characterGameStats.teamId,
      charId: characterGameStats.charId,
      hr: sql<number>`sum(${characterGameStats.hr})`.mapWith(Number),
    })
    .from(characterGameStats)
    .where(
      and(
        eq(characterGameStats.seasonId, seasonId),
        inArray(characterGameStats.teamId, teamIds),
      ),
    )
    .groupBy(characterGameStats.teamId, characterGameStats.charId);

  for (const row of hrRows) {
    if (row.hr <= 0) continue;
    const current = result.get(row.teamId)?.hrLeader;
    if (!current || row.hr > current.hr) {
      result.get(row.teamId)!.hrLeader = { charId: row.charId, hr: row.hr };
    }
  }

  const latestGameByTeam = new Map<string, string>();
  const playedGames = games
    .filter(({ game }) => game.statsRawJson != null && game.playedAt != null)
    .sort((a, b) => {
      const aTime = a.game.playedAt!.getTime();
      const bTime = b.game.playedAt!.getTime();
      if (aTime !== bTime) return bTime - aTime;
      return b.game.id.localeCompare(a.game.id);
    });

  for (const teamId of teamIds) {
    for (const { game } of playedGames) {
      if (game.homeTeamId === teamId || game.awayTeamId === teamId) {
        latestGameByTeam.set(teamId, game.id);
        break;
      }
    }
  }

  const recentGameIds = [...new Set(latestGameByTeam.values())];
  if (recentGameIds.length === 0) return result;

  const pitchingRows = await db
    .select({
      gameId: characterGameStats.gameId,
      teamId: characterGameStats.teamId,
      charId: characterGameStats.charId,
      pitchingRole: characterGameStats.pitchingRole,
      playedAt: scheduleGames.playedAt,
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .where(
      and(
        inArray(characterGameStats.gameId, recentGameIds),
        inArray(characterGameStats.teamId, teamIds),
        pitchedInGame,
        or(
          eq(characterGameStats.pitchingRole, "starter"),
          eq(characterGameStats.pitchingRole, "reliever"),
        ),
      ),
    )
    .orderBy(desc(scheduleGames.playedAt), asc(characterGameStats.rosterSlot));

  for (const row of pitchingRows) {
    const latestGameId = latestGameByTeam.get(row.teamId);
    if (!latestGameId || row.gameId !== latestGameId) continue;

    const highlight = result.get(row.teamId)!;
    if (row.pitchingRole === "starter" && !highlight.recentStarter) {
      highlight.recentStarter = { charId: row.charId };
    }
    if (row.pitchingRole === "reliever" && !highlight.recentReliever) {
      highlight.recentReliever = { charId: row.charId };
    }
  }

  return result;
}
