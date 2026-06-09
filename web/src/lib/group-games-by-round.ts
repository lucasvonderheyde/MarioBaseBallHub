export function groupGamesByRound<T extends { round: { id: string } }>(
  games: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const entry of games) {
    const key = entry.round.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return map;
}
