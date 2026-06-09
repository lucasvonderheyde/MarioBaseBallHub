import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIEBREAKER_ORDER,
  formatTiebreakerOrder,
  parseTiebreakerOrder,
  TIEBREAKER_LABELS,
} from "./tiebreakers";

describe("formatTiebreakerOrder", () => {
  it("uses readable labels instead of storage keys", () => {
    expect(formatTiebreakerOrder([...DEFAULT_TIEBREAKER_ORDER])).toBe(
      "Head-to-head wins → Head-to-head runs scored → Total runs scored → One-game playoff",
    );
  });

  it("parses stored JSON and formats for display", () => {
    const json = JSON.stringify(["h2h_record", "season_runs", "one_game"]);
    expect(formatTiebreakerOrder(parseTiebreakerOrder(json))).toBe(
      `${TIEBREAKER_LABELS.h2h_record} → ${TIEBREAKER_LABELS.season_runs} → ${TIEBREAKER_LABELS.one_game}`,
    );
  });
});
