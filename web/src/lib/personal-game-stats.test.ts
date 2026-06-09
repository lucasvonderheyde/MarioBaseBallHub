import { describe, expect, it } from "vitest";
import { duplicateStatsGameIdMessage } from "./personal-game-stats";

describe("duplicateStatsGameIdMessage", () => {
  it("describes schedule duplicates", () => {
    expect(
      duplicateStatsGameIdMessage({ source: "schedule", scheduleGameId: "g1" }),
    ).toMatch(/season game/);
  });

  it("describes personal duplicates", () => {
    expect(
      duplicateStatsGameIdMessage({ source: "personal", personalGameId: "p1" }),
    ).toMatch(/lifetime stats/);
  });
});
