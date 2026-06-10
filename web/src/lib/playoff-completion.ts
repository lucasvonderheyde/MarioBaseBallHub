type ScheduledGame = {
  game: { playedAt: Date | null };
  round: { phase: string };
};

/** True when every scheduled playoff game has been played. */
export function isPlayoffsComplete(games: ScheduledGame[]): boolean {
  const playoffGames = games.filter(({ round }) => round.phase === "playoffs");
  if (playoffGames.length === 0) return false;
  return playoffGames.every(({ game }) => game.playedAt != null);
}
