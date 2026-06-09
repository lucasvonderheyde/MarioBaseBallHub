import type { TeamStandingRow } from "@/domain/standings/compute-standings";
import {
  type PlayoffSettings,
  playInEnabled,
} from "@/domain/playoffs/playoff-settings";

export type SeedStatus = "qualified" | "play-in" | "out";

export type SeededTeam = {
  seed: number;
  teamId: string;
  name: string;
  status: SeedStatus;
  wins: number;
  losses: number;
};

export type PlayoffGameView = {
  id: string;
  roundNumber: number;
  slotInRound: number;
  homeTeamId: string;
  awayTeamId: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
  statsGameId: string | null;
};

export type PlayoffPicture = {
  seeds: SeededTeam[];
  playInGames: PlayoffGameView[];
  mainBracketRounds: { roundNumber: number; games: PlayoffGameView[] }[];
};

type RoundRow = {
  id: string;
  phase: "regular" | "playoffs";
  roundNumber: number;
};

type GameRow = {
  id: string;
  roundId: string;
  slotInRound: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  playedAt: Date | null;
  statsGameId: string | null;
};

function seedStatuses(
  standings: TeamStandingRow[],
  settings: PlayoffSettings,
): SeededTeam[] {
  const playIn = playInEnabled(settings);
  return standings.map((row, index) => {
    const seed = index + 1;
    let status: SeedStatus = "out";
    if (seed <= settings.autoQualifyCount) {
      status = "qualified";
    } else if (playIn && seed <= settings.autoQualifyCount + settings.playInTeamCount) {
      status = "play-in";
    }
    return {
      seed,
      teamId: row.teamId,
      name: row.name,
      status,
      wins: row.wins,
      losses: row.losses,
    };
  });
}

function toGameView(
  game: GameRow,
  roundNumber: number,
  teamNames: Map<string, string>,
): PlayoffGameView {
  const played =
    game.playedAt != null && game.homeScore != null && game.awayScore != null;
  return {
    id: game.id,
    roundNumber,
    slotInRound: game.slotInRound,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    homeName: teamNames.get(game.homeTeamId) ?? "?",
    awayName: teamNames.get(game.awayTeamId) ?? "?",
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    played,
    statsGameId: game.statsGameId,
  };
}

export function buildPlayoffPicture(input: {
  standings: TeamStandingRow[];
  settings: PlayoffSettings;
  rounds: RoundRow[];
  games: { game: GameRow; round: RoundRow }[];
  teamNames: Map<string, string>;
}): PlayoffPicture {
  const seeds = seedStatuses(input.standings, input.settings);
  const playIn = playInEnabled(input.settings);

  const playoffGames = input.games.filter(({ round }) => round.phase === "playoffs");
  const playInGames = playIn
    ? playoffGames
        .filter(({ round }) => round.roundNumber === input.settings.playInRoundNumber)
        .map(({ game, round }) => toGameView(game, round.roundNumber, input.teamNames))
        .sort((a, b) => a.slotInRound - b.slotInRound)
    : [];

  const playoffRoundNumbers = input.rounds
    .filter((r) => r.phase === "playoffs")
    .map((r) => r.roundNumber);

  const mainStartRound = playIn
    ? input.settings.playInRoundNumber + 1
    : playoffRoundNumbers.length > 0
      ? Math.min(...playoffRoundNumbers)
      : 1;

  const mainByRound = new Map<number, PlayoffGameView[]>();
  for (const { game, round } of playoffGames) {
    if (playIn && round.roundNumber <= input.settings.playInRoundNumber) continue;
    if (!playIn && round.roundNumber < mainStartRound) continue;
    const list = mainByRound.get(round.roundNumber) ?? [];
    list.push(toGameView(game, round.roundNumber, input.teamNames));
    mainByRound.set(round.roundNumber, list);
  }

  const mainBracketRounds = [...mainByRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, games]) => ({
      roundNumber,
      games: games.sort((a, b) => a.slotInRound - b.slotInRound),
    }));

  return { seeds, playInGames, mainBracketRounds };
}
