export type ScheduleRoundPhase = "regular" | "playoffs";

export type UpcomingScheduleGame<TGame> = {
  game: TGame;
  round: { phase: ScheduleRoundPhase; roundNumber: number };
};

export function isScheduleGameUnplayed(game: {
  homeScore: number | null;
  awayScore: number | null;
  statsRawJson: string | null;
}): boolean {
  const hasFinalScore = game.homeScore != null && game.awayScore != null;
  return !hasFinalScore && !game.statsRawJson;
}

function compareScheduleOrder<TGame extends { slotInRound: number }>(
  a: UpcomingScheduleGame<TGame>,
  b: UpcomingScheduleGame<TGame>,
): number {
  if (a.round.roundNumber !== b.round.roundNumber) {
    return a.round.roundNumber - b.round.roundNumber;
  }
  return a.game.slotInRound - b.game.slotInRound;
}

export function selectUpcomingScheduleGames<TGame extends {
  slotInRound: number;
  homeScore: number | null;
  awayScore: number | null;
  statsRawJson: string | null;
}>(
  games: UpcomingScheduleGame<TGame>[],
  limit = 4,
): { games: UpcomingScheduleGame<TGame>[]; phase: ScheduleRoundPhase } {
  const unplayed = games.filter(({ game }) => isScheduleGameUnplayed(game));

  const unplayedPlayoffs = unplayed
    .filter((entry) => entry.round.phase === "playoffs")
    .sort(compareScheduleOrder);
  if (unplayedPlayoffs.length > 0) {
    return {
      games: unplayedPlayoffs.slice(0, limit),
      phase: "playoffs",
    };
  }

  const unplayedRegular = unplayed
    .filter((entry) => entry.round.phase === "regular")
    .sort(compareScheduleOrder);

  return {
    games: unplayedRegular.slice(0, limit),
    phase: "regular",
  };
}
