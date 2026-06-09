/** Stored JSON in seasons.tiebreakerOrder */
export const DEFAULT_TIEBREAKER_ORDER = [
  "h2h_record",
  "h2h_runs",
  "season_runs",
  "one_game",
] as const;

export type TiebreakerKey = (typeof DEFAULT_TIEBREAKER_ORDER)[number];

export const TIEBREAKER_LABELS: Record<TiebreakerKey, string> = {
  h2h_record: "Head-to-head wins",
  h2h_runs: "Head-to-head runs scored",
  season_runs: "Total runs scored",
  one_game: "One-game playoff",
};

export const TIEBREAKER_DESCRIPTIONS: Record<TiebreakerKey, string> = {
  h2h_record: "Wins in games played directly against the tied team",
  h2h_runs: "Total runs scored in head-to-head games vs. the tied team",
  season_runs: "Total runs scored across the full regular season",
  one_game: "A scheduled tiebreaker game decides the final order",
};

export function formatTiebreakerOrder(order: TiebreakerKey[]): string {
  return order.map((key) => TIEBREAKER_LABELS[key]).join(" → ");
}

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
