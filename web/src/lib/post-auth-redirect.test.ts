import { describe, expect, it } from "vitest";
import { pickDefaultSeasonId, sortSeasonsForDisplay } from "@/lib/league-season-sort";

describe("post-auth redirect logic", () => {
  it("picks active season hub path when one league and active season exist", () => {
    const leagueId = "league-1";
    const seasons = sortSeasonsForDisplay([
      {
        id: "season-setup",
        status: "setup" as const,
        createdAt: new Date("2024-01-01"),
      },
      {
        id: "season-active",
        status: "active" as const,
        createdAt: new Date("2024-02-01"),
      },
    ]);
    const activeSeasonId = pickDefaultSeasonId(seasons);
    expect(activeSeasonId).toBe("season-active");
    expect(`/leagues/${leagueId}/seasons/${activeSeasonId}`).toBe(
      "/leagues/league-1/seasons/season-active",
    );
  });

  it("falls back to league home when no seasons exist", () => {
    const activeSeasonId = pickDefaultSeasonId([]);
    expect(activeSeasonId).toBeNull();
  });
});
