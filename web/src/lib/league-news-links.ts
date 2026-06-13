export function gameRecapPageHref(
  leagueId: string,
  seasonId: string,
  gameId: string,
): string {
  return `/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}#inky-recap`;
}
