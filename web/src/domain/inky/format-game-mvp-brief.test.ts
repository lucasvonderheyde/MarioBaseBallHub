import { describe, expect, it } from "vitest";
import type { GameMvpPick } from "@/domain/stats/compute-game-mvp";
import {
  formatGameMvpBriefLine,
  winningTeamIdFromScore,
} from "@/domain/inky/format-game-mvp-brief";

describe("formatGameMvpBriefLine", () => {
  it("includes character, team, side, and stat summary", () => {
    const mvp: GameMvpPick = {
      charId: "mario",
      teamId: "team-a",
      teamSide: "Away",
      score: 18,
      summary: "2 HR, 4 RBI",
    };

    expect(formatGameMvpBriefLine(mvp, "Mario", "Mushroom Kingdom")).toBe(
      "Game MVP: Mario (Mushroom Kingdom, Away) — 2 HR, 4 RBI",
    );
  });
});

describe("winningTeamIdFromScore", () => {
  it("returns away team when away score is higher", () => {
    expect(winningTeamIdFromScore(5, 3, "away-id", "home-id")).toBe("away-id");
  });

  it("returns home team when home score is higher", () => {
    expect(winningTeamIdFromScore(2, 7, "away-id", "home-id")).toBe("home-id");
  });

  it("returns null on a tie", () => {
    expect(winningTeamIdFromScore(4, 4, "away-id", "home-id")).toBeNull();
  });
});
