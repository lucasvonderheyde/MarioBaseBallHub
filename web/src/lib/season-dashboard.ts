import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  characters,
  leagues,
  rosterInstances,
  rounds,
  scheduleGames,
  seasons,
  stadiums,
  teams,
  users,
} from "@/db/schema";
import { computeStandings, type FinishedGame } from "@/lib/standings";
import { parseTiebreakerOrder } from "@/lib/tiebreakers";

export async function getSeasonDashboard(seasonId: string) {
  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  if (!season) return null;
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, season.leagueId))
    .limit(1);
  if (!league) return null;

  const teamRows = await db
    .select({
      team: teams,
      manager: users,
    })
    .from(teams)
    .leftJoin(users, eq(teams.managerUserId, users.id))
    .where(eq(teams.seasonId, seasonId));

  const roundRows = await db
    .select()
    .from(rounds)
    .where(eq(rounds.seasonId, seasonId))
    .orderBy(asc(rounds.phase), asc(rounds.roundNumber));

  const gameRows = await db
    .select({
      game: scheduleGames,
      round: rounds,
    })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .where(eq(rounds.seasonId, seasonId))
    .orderBy(asc(rounds.phase), asc(rounds.roundNumber), asc(scheduleGames.slotInRound));

  const rosterRows = await db
    .select({
      instance: rosterInstances,
      character: characters,
    })
    .from(rosterInstances)
    .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
    .where(eq(rosterInstances.seasonId, seasonId));

  const stadiumRows = await db.select().from(stadiums);

  const teamIds = teamRows.map((t) => t.team.id);
  const teamNames = new Map(teamRows.map((t) => [t.team.id, t.team.name]));

  const regularGames: FinishedGame[] = [];
  for (const { game, round } of gameRows) {
    if (round.phase !== "regular") continue;
    if (
      game.homeScore == null ||
      game.awayScore == null ||
      game.playedAt == null
    )
      continue;
    regularGames.push({
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
    });
  }

  const standings = computeStandings(
    teamIds,
    teamNames,
    regularGames,
    parseTiebreakerOrder(season.tiebreakerOrder),
  );

  return {
    season,
    league,
    teams: teamRows,
    rounds: roundRows,
    games: gameRows,
    roster: rosterRows,
    stadiums: stadiumRows,
    standings,
  };
}
