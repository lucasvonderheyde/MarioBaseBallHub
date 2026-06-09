import { getCharacterRatings } from "@/data/character-ratings";
import {
  pickRivalryOfWeek,
  type RivalryOfWeekPick,
} from "@/domain/odds/rivalry-of-week";
import { rosterTalentScore } from "@/domain/odds/character-power";
import {
  championshipOddsFromPower,
  computeTeamPowerRating,
} from "@/domain/odds/team-power";
import { computeGameWinProbability } from "@/domain/odds/game-win-probability";
import type { FinishedGame } from "@/domain/standings/compute-standings";
import type { getSeasonDashboard } from "@/lib/season-dashboard";

type Dashboard = NonNullable<Awaited<ReturnType<typeof getSeasonDashboard>>>;

export type SeasonOddsSnapshot = {
  teamPowers: Map<string, number>;
  championshipOdds: Map<string, number>;
  rivalryOfWeek: RivalryOfWeekPick | null;
  gameOdds: Map<
    string,
    { homeWinPct: number; awayWinPct: number }
  >;
};

function gamesPlayedByTeam(
  teamId: string,
  finishedGames: FinishedGame[],
): number {
  return finishedGames.filter(
    (game) => game.homeTeamId === teamId || game.awayTeamId === teamId,
  ).length;
}

function h2hWins(
  team: string,
  opponent: string,
  games: FinishedGame[],
): number {
  let wins = 0;
  for (const game of games) {
    const isPair =
      (game.homeTeamId === team && game.awayTeamId === opponent) ||
      (game.homeTeamId === opponent && game.awayTeamId === team);
    if (!isPair || game.homeScore === game.awayScore) continue;
    const homeWon = game.homeScore > game.awayScore;
    if (game.homeTeamId === team && homeWon) wins++;
    if (game.awayTeamId === team && !homeWon) wins++;
  }
  return wins;
}

export function buildSeasonOddsSnapshot(dash: Dashboard): SeasonOddsSnapshot {
  const finishedGames: FinishedGame[] = [];
  for (const { game, round } of dash.games) {
    if (round.phase !== "regular") continue;
    if (
      game.homeScore == null ||
      game.awayScore == null ||
      game.playedAt == null
    ) {
      continue;
    }
    finishedGames.push({
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
    });
  }

  const rosterByTeam = new Map<string, string[]>();
  for (const { instance } of dash.roster) {
    if (!instance.teamId) continue;
    const list = rosterByTeam.get(instance.teamId) ?? [];
    list.push(instance.characterId);
    rosterByTeam.set(instance.teamId, list);
  }

  const standingById = new Map(
    dash.standings.map((row, index) => [
      row.teamId,
      { ...row, rank: index + 1 },
    ]),
  );

  const teamPowers = new Map<string, number>();
  for (const { team } of dash.teams) {
    const charIds = rosterByTeam.get(team.id) ?? [];
    const rosterTalent = rosterTalentScore(charIds, getCharacterRatings);
    const standing = standingById.get(team.id);
    const played = gamesPlayedByTeam(team.id, finishedGames);
    teamPowers.set(
      team.id,
      computeTeamPowerRating({
        teamId: team.id,
        rosterTalent,
        standing,
        gamesPlayed: played,
      }),
    );
  }

  const championshipOdds = championshipOddsFromPower(
    [...teamPowers.entries()].map(([teamId, power]) => ({ teamId, power })),
  );

  const gameOdds = new Map<string, { homeWinPct: number; awayWinPct: number }>();
  for (const { game } of dash.games) {
    if (game.homeScore != null && game.awayScore != null) continue;
    const homePower = teamPowers.get(game.homeTeamId) ?? 50;
    const awayPower = teamPowers.get(game.awayTeamId) ?? 50;
    const odds = computeGameWinProbability({
      homePower,
      awayPower,
      h2hHomeWins: h2hWins(game.homeTeamId, game.awayTeamId, finishedGames),
      h2hAwayWins: h2hWins(game.awayTeamId, game.homeTeamId, finishedGames),
    });
    gameOdds.set(game.id, odds);
  }

  const rivalryOfWeek = pickRivalryOfWeek({
    games: dash.games.map(({ game, round }) => ({
      gameId: game.id,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      roundNumber: round.roundNumber,
      phase: round.phase,
      slotInRound: game.slotInRound,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      statsRawJson: game.statsRawJson,
    })),
    standings: dash.standings.map((row, index) => ({
      teamId: row.teamId,
      wins: row.wins,
      losses: row.losses,
      rank: index + 1,
    })),
    finishedGames,
    teamPowers,
  });

  return {
    teamPowers,
    championshipOdds,
    rivalryOfWeek,
    gameOdds,
  };
}
