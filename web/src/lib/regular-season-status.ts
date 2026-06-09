type ScheduledGame = {
  game: { playedAt: Date | null };
  round: { phase: string };
};

/** True when every scheduled regular-season game has been played. */
export function isRegularSeasonComplete(games: ScheduledGame[]): boolean {
  const regular = games.filter(({ round }) => round.phase === "regular");
  if (regular.length === 0) return false;
  return regular.every(({ game }) => game.playedAt != null);
}
