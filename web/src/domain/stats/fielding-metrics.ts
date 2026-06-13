import type { FieldingPositionCode, FieldingPositionMap } from "./fielding-by-position";
import { primaryFieldingPosition } from "./fielding-by-position";

export function fieldingRatePerGame(total: number, games: number): number | null {
  if (games <= 0) return null;
  return total / games;
}

export function formatFieldingRate(value: number | null, digits = 2): string {
  if (value == null) return "—";
  return value.toFixed(digits);
}

export function formatHomerunDistance(feet: number | null): string {
  if (feet == null) return "—";
  return `${Math.round(feet)} ft`;
}

export function formatPrimaryPosition(
  batters: FieldingPositionMap,
): FieldingPositionCode | "—" {
  return primaryFieldingPosition(batters) ?? "—";
}
