/** Stored JSON in seasons.tiebreakerOrder */
export const DEFAULT_TIEBREAKER_ORDER = [
  "h2h_record",
  "h2h_runs",
  "season_runs",
  "one_game",
] as const;

export type TiebreakerKey = (typeof DEFAULT_TIEBREAKER_ORDER)[number];

export function parseTiebreakerOrder(json: string): TiebreakerKey[] {
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [...DEFAULT_TIEBREAKER_ORDER];
    const allowed = new Set<string>(DEFAULT_TIEBREAKER_ORDER);
    const filtered = arr.filter((x): x is TiebreakerKey => allowed.has(String(x)));
    return filtered.length ? filtered : [...DEFAULT_TIEBREAKER_ORDER];
  } catch {
    return [...DEFAULT_TIEBREAKER_ORDER];
  }
}

export function serializeTiebreakerOrder(order: TiebreakerKey[]): string {
  return JSON.stringify(order);
}
