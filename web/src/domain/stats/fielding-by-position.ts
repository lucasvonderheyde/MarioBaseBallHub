export const FIELDING_POSITIONS = [
  "P",
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
] as const;

export type FieldingPositionCode = (typeof FIELDING_POSITIONS)[number];

export type FieldingPositionMap = Partial<Record<FieldingPositionCode, number>>;

export type FieldingByPosition = {
  outs: FieldingPositionMap;
  batterOuts: FieldingPositionMap;
  batters: FieldingPositionMap;
};

const POSITION_SET = new Set<string>(FIELDING_POSITIONS);

function isPositionCode(value: string): value is FieldingPositionCode {
  return POSITION_SET.has(value);
}

/** Merges MSSB position arrays like [{ CF: 46 }, { LF: 2 }] into one map. */
export function parsePositionArray(raw: unknown): FieldingPositionMap {
  if (!Array.isArray(raw)) return {};

  const merged: FieldingPositionMap = {};
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
      if (!isPositionCode(key)) continue;
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      merged[key] = (merged[key] ?? 0) + amount;
    }
  }
  return merged;
}

export function parseFieldingByPosition(
  defensiveStats: Record<string, unknown>,
): FieldingByPosition {
  return {
    outs: parsePositionArray(defensiveStats["Outs Per Position"]),
    batterOuts: parsePositionArray(defensiveStats["Batter Outs Per Position"]),
    batters: parsePositionArray(defensiveStats["Batters Per Position"]),
  };
}

export function sumPositionMap(map: FieldingPositionMap): number {
  return Object.values(map).reduce((total, value) => total + (value ?? 0), 0);
}

export function mergePositionMaps(
  ...maps: FieldingPositionMap[]
): FieldingPositionMap {
  const merged: FieldingPositionMap = {};
  for (const map of maps) {
    for (const [position, value] of Object.entries(map)) {
      if (!isPositionCode(position) || value == null) continue;
      merged[position] = (merged[position] ?? 0) + value;
    }
  }
  return merged;
}

export function primaryFieldingPosition(
  batters: FieldingPositionMap,
): FieldingPositionCode | null {
  let best: FieldingPositionCode | null = null;
  let bestValue = 0;
  for (const position of FIELDING_POSITIONS) {
    const value = batters[position] ?? 0;
    if (value > bestValue) {
      best = position;
      bestValue = value;
    }
  }
  return best;
}

export function playedInField(fielding: FieldingByPosition): boolean {
  return (
    sumPositionMap(fielding.outs) > 0 ||
    sumPositionMap(fielding.batters) > 0 ||
    sumPositionMap(fielding.batterOuts) > 0
  );
}
