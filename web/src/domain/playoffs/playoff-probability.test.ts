import { describe, expect, it } from "vitest";
import { simulatePlayoffProbabilities } from "./playoff-probability";
import type { FinishedGame } from "@/domain/standings/compute-standings";

const teamIds = ["a", "b", "c", "d"];
const teamNames = new Map(teamIds.map((id) => [id, id.toUpperCase()]));

function game(
  home: string,
  away: string,
  homeScore: number,
  awayScore: number,
): FinishedGame {
  return { homeTeamId: home, awayTeamId: away, homeScore, awayScore };
}

describe("simulatePlayoffProbabilities", () => {
  it("is deterministic for a given seed", () => {
    const input = {
      teamIds,
      teamNames,
      finishedGames: [game("a", "b", 5, 3), game("c", "d", 2, 4)],
      remainingGames: [
        { homeTeamId: "a", awayTeamId: "c", homeWinPct: 0.6 },
        { homeTeamId: "b", awayTeamId: "d", homeWinPct: 0.5 },
      ],
      tiebreakerOrder: [],
      playoffSpots: 2,
      simulations: 500,
      seed: 42,
    };
    expect(simulatePlayoffProbabilities(input)).toEqual(
      simulatePlayoffProbabilities(input),
    );
  });

  it("returns certainty when no games remain", () => {
    const rows = simulatePlayoffProbabilities({
      teamIds,
      teamNames,
      finishedGames: [
        game("a", "b", 5, 3),
        game("a", "c", 5, 3),
        game("b", "c", 5, 3),
        game("d", "a", 0, 1),
        game("d", "b", 0, 1),
        game("d", "c", 0, 1),
      ],
      remainingGames: [],
      tiebreakerOrder: [],
      playoffSpots: 2,
    });
    const byTeam = new Map(rows.map((r) => [r.teamId, r]));
    expect(byTeam.get("a")!.playoffPct).toBe(1);
    expect(byTeam.get("a")!.topSeedPct).toBe(1);
    expect(byTeam.get("d")!.playoffPct).toBe(0);
  });

  it("gives a mathematically eliminated team zero percent", () => {
    // d is 0-3; everyone else has 2+ wins and d has no games left.
    const rows = simulatePlayoffProbabilities({
      teamIds,
      teamNames,
      finishedGames: [
        game("a", "d", 9, 0),
        game("b", "d", 9, 0),
        game("c", "d", 9, 0),
        game("a", "b", 3, 2),
        game("b", "c", 3, 2),
        game("c", "a", 3, 2),
      ],
      remainingGames: [
        { homeTeamId: "a", awayTeamId: "b", homeWinPct: 0.5 },
        { homeTeamId: "b", awayTeamId: "c", homeWinPct: 0.5 },
      ],
      tiebreakerOrder: [],
      playoffSpots: 2,
      simulations: 300,
      seed: 7,
    });
    expect(rows.find((r) => r.teamId === "d")!.playoffPct).toBe(0);
  });

  it("gives the stronger team higher odds in a coin-flip race", () => {
    // a and b are tied; a is heavily favored in the head-to-head decider.
    const rows = simulatePlayoffProbabilities({
      teamIds: ["a", "b"],
      teamNames,
      finishedGames: [game("a", "b", 4, 2), game("b", "a", 4, 2)],
      remainingGames: [{ homeTeamId: "a", awayTeamId: "b", homeWinPct: 0.9 }],
      tiebreakerOrder: [],
      playoffSpots: 1,
      simulations: 2000,
      seed: 11,
    });
    const a = rows.find((r) => r.teamId === "a")!;
    const b = rows.find((r) => r.teamId === "b")!;
    expect(a.playoffPct).toBeGreaterThan(0.8);
    expect(a.playoffPct + b.playoffPct).toBeCloseTo(1, 5);
  });
});
