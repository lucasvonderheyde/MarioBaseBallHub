import { describe, expect, it } from "vitest";
import { computeStandings, type FinishedGame } from "./compute-standings";
import type { TiebreakerKey } from "./tiebreakers";

const order: TiebreakerKey[] = [
  "h2h_record",
  "h2h_runs",
  "season_runs",
  "one_game",
];

describe("computeStandings", () => {
  it("ranks by wins then head-to-head when two teams tied", () => {
    const teamIds = ["a", "b"];
    const names = new Map([
      ["a", "Team A"],
      ["b", "Team B"],
    ]);
    const games: FinishedGame[] = [
      { homeTeamId: "a", awayTeamId: "b", homeScore: 5, awayScore: 3 },
      { homeTeamId: "b", awayTeamId: "a", homeScore: 1, awayScore: 4 },
    ];
    const rows = computeStandings(teamIds, names, games, order);
    expect(rows[0]!.teamId).toBe("a");
    expect(rows[0]!.wins).toBe(2);
    expect(rows[1]!.wins).toBe(0);
  });
});
