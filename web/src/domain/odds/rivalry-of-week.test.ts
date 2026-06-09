import { describe, expect, it } from "vitest";
import { pickRivalryOfWeek } from "./rivalry-of-week";

describe("pickRivalryOfWeek", () => {
  it("prefers an underdog duel over a top-team mismatch in the same week", () => {
    const pick = pickRivalryOfWeek({
      games: [
        {
          gameId: "g1",
          homeTeamId: "t1",
          awayTeamId: "t2",
          roundNumber: 2,
          phase: "regular",
          slotInRound: 1,
          homeScore: null,
          awayScore: null,
          statsRawJson: null,
        },
        {
          gameId: "g2",
          homeTeamId: "t3",
          awayTeamId: "t4",
          roundNumber: 2,
          phase: "regular",
          slotInRound: 2,
          homeScore: null,
          awayScore: null,
          statsRawJson: null,
        },
      ],
      standings: [
        { teamId: "t1", wins: 8, losses: 1, rank: 1 },
        { teamId: "t2", wins: 7, losses: 2, rank: 2 },
        { teamId: "t3", wins: 2, losses: 7, rank: 7 },
        { teamId: "t4", wins: 1, losses: 8, rank: 8 },
      ],
      finishedGames: [],
      teamPowers: new Map([
        ["t1", 70],
        ["t2", 68],
        ["t3", 42],
        ["t4", 40],
      ]),
    });

    expect(pick?.game.gameId).toBe("g2");
    expect(pick?.reasons).toContain("underdog_battle");
  });
});
