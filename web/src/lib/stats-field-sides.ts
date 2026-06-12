import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  characters,
  rosterInstances,
  rounds,
  scheduleGames,
  teams,
  users,
} from "@/db/schema";
import { parseDecodedGameFile } from "@/domain/stats/decode-game-file";
import { matchNetplayTeams } from "@/domain/stats/match-netplay-teams";
import { parseCharacterGameStats } from "@/domain/stats/parse-character-game-stats";
import { charIdsForSide } from "@/domain/stats/roster-team-match";

export type StatsFieldSides = {
  awayTeamId: string;
  homeTeamId: string;
  awayPlayer: string;
  homePlayer: string;
  /**
   * Scores re-oriented to the scheduled home/away slots, or null when the
   * netplay match was ambiguous. Games uploaded before the orientation fix
   * may store file-side scores; backfilling from these repairs them.
   */
  scheduleHomeScore: number | null;
  scheduleAwayScore: number | null;
};

export async function resolveStatsFieldSidesForGame(
  gameId: string,
  seasonId: string,
  rawJson: string,
): Promise<StatsFieldSides | null> {
  let parsed;
  try {
    parsed = parseDecodedGameFile(rawJson);
  } catch {
    return null;
  }

  const [game] = await db
    .select({
      homeTeamId: scheduleGames.homeTeamId,
      awayTeamId: scheduleGames.awayTeamId,
    })
    .from(scheduleGames)
    .where(eq(scheduleGames.id, gameId))
    .limit(1);
  if (!game) return null;

  const teamRows = await db
    .select()
    .from(teams)
    .where(inArray(teams.id, [game.homeTeamId, game.awayTeamId]));
  const home = teamRows.find((team) => team.id === game.homeTeamId);
  const away = teamRows.find((team) => team.id === game.awayTeamId);
  if (!home || !away) return null;

  const managerIds = [home.managerUserId, away.managerUserId].filter(
    (id): id is string => id != null,
  );
  const managerRows =
    managerIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, managerIds))
      : [];
  const hm = home.managerUserId
    ? managerRows.find((user) => user.id === home.managerUserId) ?? null
    : null;
  const am = away.managerUserId
    ? managerRows.find((user) => user.id === away.managerUserId) ?? null
    : null;

  let rosterContext;
  try {
    const characterStats = parseCharacterGameStats(JSON.parse(rawJson) as unknown);
    const rosterRows = await db
      .select({
        teamId: rosterInstances.teamId,
        gameCharId: characters.gameCharId,
      })
      .from(rosterInstances)
      .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
      .where(
        and(
          eq(rosterInstances.seasonId, seasonId),
          isNotNull(rosterInstances.teamId),
          inArray(rosterInstances.teamId, [home.id, away.id]),
        ),
      );

    const charIdsByTeam = new Map<string, string[]>();
    for (const teamId of [home.id, away.id]) {
      charIdsByTeam.set(teamId, []);
    }
    for (const row of rosterRows) {
      if (!row.teamId) continue;
      charIdsByTeam.get(row.teamId)?.push(row.gameCharId);
    }

    rosterContext = {
      awayCharIds: charIdsForSide(characterStats.characterStats, "Away"),
      homeCharIds: charIdsForSide(characterStats.characterStats, "Home"),
      teamRosters: [home.id, away.id].map((teamId) => ({
        teamId,
        charIds: charIdsByTeam.get(teamId) ?? [],
      })),
    };
  } catch {
    rosterContext = undefined;
  }

  const match = matchNetplayTeams(
    parsed,
    {
      teamId: home.id,
      teamName: home.name,
      manager: hm,
    },
    {
      teamId: away.id,
      teamName: away.name,
      manager: am,
    },
    rosterContext,
  );

  if (match.blockingError) {
    return {
      awayTeamId: game.awayTeamId,
      homeTeamId: game.homeTeamId,
      awayPlayer: parsed.awayPlayer,
      homePlayer: parsed.homePlayer,
      scheduleHomeScore: null,
      scheduleAwayScore: null,
    };
  }

  return {
    awayTeamId: match.awaySideTeamId,
    homeTeamId: match.homeSideTeamId,
    awayPlayer: parsed.awayPlayer,
    homePlayer: parsed.homePlayer,
    scheduleHomeScore: match.scheduleHomeScore,
    scheduleAwayScore: match.scheduleAwayScore,
  };
}

export async function backfillStatsFieldSides(seasonId: string): Promise<number> {
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
    const sides = await resolveStatsFieldSidesForGame(
      game.id,
      seasonId,
      game.statsRawJson,
    );
    if (!sides) continue;

    await db
      .update(scheduleGames)
      .set({
        statsAwayTeamId: sides.awayTeamId,
        statsHomeTeamId: sides.homeTeamId,
        statsAwayPlayer: sides.awayPlayer,
        statsHomePlayer: sides.homePlayer,
        ...(sides.scheduleHomeScore != null && sides.scheduleAwayScore != null
          ? {
              homeScore: sides.scheduleHomeScore,
              awayScore: sides.scheduleAwayScore,
            }
          : {}),
      })
      .where(eq(scheduleGames.id, game.id));
    count++;
  }

  return count;
}
