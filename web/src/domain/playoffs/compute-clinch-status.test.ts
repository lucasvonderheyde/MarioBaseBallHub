import { describe, expect, it } from "vitest";
import { computeClinchStatus } from "./compute-clinch-status";
import { DEFAULT_PLAYOFF_SETTINGS } from "./playoff-settings";
import type { TeamStandingRow } from "@/domain/standings/compute-standings";

function row(teamId: string, wins: number, losses: number): TeamStandingRow {
  return { teamId, name: teamId, wins, losses, runsFor: 0, runsAgainst: 0 };
}

// 2 auto spots, no play-in, higher seed gets home field.
const settings = {
  ...DEFAULT_PLAYOFF_SETTINGS,
  autoQualifyCount: 2,
  playInTeamCount: 0,
  playInSpots: 0,
  mainBracketTeamCount: 2,
};

describe("computeClinchStatus", () => {
  it("awards top seed only when no team can reach the leader's wins", () => {
    const statuses = computeClinchStatus({
      standings: [row("a", 10, 2), row("b", 7, 5), row("c", 2, 10)],
      settings,
      // b has 2 games left → max 9 < 10; c has 2 left → max 4.
      remainingRegularGames: [
        { homeTeamId: "b", awayTeamId: "c" },
        { homeTeamId: "c", awayTeamId: "b" },
      ],
    });
    const a = statuses.find((s) => s.teamId === "a")!;
    expect(a.badges).toContain("clinched-top-seed");
    expect(a.badges).toContain("clinched-home-field");
    expect(a.badges).toContain("clinched-playoffs");
  });

  it("treats a possible tie as not clinched (tiebreaker could go either way)", () => {
    const statuses = computeClinchStatus({
      standings: [row("a", 10, 2), row("b", 8, 4), row("c", 2, 10)],
      settings,
      // b can reach exactly 10 — tie, so a has not clinched top seed.
      remainingRegularGames: [
        { homeTeamId: "b", awayTeamId: "c" },
        { homeTeamId: "c", awayTeamId: "b" },
      ],
    });
    const a = statuses.find((s) => s.teamId === "a")!;
    expect(a.badges).not.toContain("clinched-top-seed");
    // Only b can catch a → a still holds one of the two playoff spots.
    expect(a.badges).toContain("clinched-playoffs");
  });

  it("does not award playoffs when enough lower teams can pass, even with zero games left for the leader", () => {
    // Regression for the old `cutoffIndex + remaining` bound: leader has no
    // games remaining but two teams below can both pass its win total.
    const statuses = computeClinchStatus({
      standings: [row("a", 6, 6), row("b", 5, 5), row("c", 5, 5)],
      settings,
      remainingRegularGames: [
        { homeTeamId: "b", awayTeamId: "x" },
        { homeTeamId: "b", awayTeamId: "x" },
        { homeTeamId: "c", awayTeamId: "x" },
        { homeTeamId: "c", awayTeamId: "x" },
      ],
    });
    const a = statuses.find((s) => s.teamId === "a")!;
    expect(a.badges).not.toContain("clinched-playoffs");
  });

  it("awards everything when the season is over", () => {
    const statuses = computeClinchStatus({
      standings: [row("a", 10, 2), row("b", 8, 4), row("c", 2, 10)],
      settings,
      remainingRegularGames: [],
    });
    expect(statuses.find((s) => s.teamId === "a")!.badges).toEqual([
      "clinched-top-seed",
      "clinched-home-field",
      "clinched-playoffs",
    ]);
    expect(statuses.find((s) => s.teamId === "b")!.badges).toEqual([
      "clinched-playoffs",
    ]);
    expect(statuses.find((s) => s.teamId === "c")!.badges).toEqual([]);
  });

  it("counts play-in spots toward the playoff cutoff", () => {
    const playInSettings = {
      ...settings,
      autoQualifyCount: 1,
      playInTeamCount: 2,
      playInSpots: 1,
      playInRoundNumber: 1,
    };
    const statuses = computeClinchStatus({
      standings: [row("a", 9, 3), row("b", 7, 5), row("c", 1, 11)],
      settings: playInSettings,
      // c can reach at most 3 wins — below b's 7, so b clinched a spot
      // in the two-team cutoff (1 auto + 1 play-in).
      remainingRegularGames: [
        { homeTeamId: "c", awayTeamId: "x" },
        { homeTeamId: "c", awayTeamId: "x" },
      ],
    });
    expect(statuses.find((s) => s.teamId === "b")!.badges).toContain(
      "clinched-playoffs",
    );
  });
});
