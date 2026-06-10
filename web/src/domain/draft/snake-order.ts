/** Team on the clock for a zero-based pick index in a snake draft. */
export function teamIdForPickIndex(teamOrder: string[], pickIndex: number): string | null {
  if (teamOrder.length === 0 || pickIndex < 0) return null;
  const teamCount = teamOrder.length;
  const round = Math.floor(pickIndex / teamCount);
  const positionInRound = pickIndex % teamCount;
  if (round % 2 === 0) {
    return teamOrder[positionInRound] ?? null;
  }
  return teamOrder[teamCount - 1 - positionInRound] ?? null;
}

export function totalDraftPicks(teamCount: number, picksPerTeam: number): number {
  return teamCount * picksPerTeam;
}

export function isDraftFinished(
  teamCount: number,
  picksPerTeam: number,
  currentPickIndex: number,
): boolean {
  return currentPickIndex >= totalDraftPicks(teamCount, picksPerTeam);
}
