import { describe, expect, it } from "vitest";
import {
  isScheduleGameUnplayed,
  selectUpcomingScheduleGames,
} from "./upcoming-schedule-games";

function game(
  id: string,
  roundNumber: number,
  slot: number,
  phase: "regular" | "playoffs" = "regular",
  played = false,
) {
  return {
    game: {
      id,
      slotInRound: slot,
      homeScore: played ? 1 : null,
      awayScore: played ? 0 : null,
      statsRawJson: played ? "{}" : null,
    },
    round: { phase, roundNumber },
  };
}

describe("upcoming schedule games", () => {
  it("detects unplayed games", () => {
    expect(
      isScheduleGameUnplayed({
        homeScore: null,
        awayScore: null,
        statsRawJson: null,
      }),
    ).toBe(true);
    expect(
      isScheduleGameUnplayed({
        homeScore: 2,
        awayScore: 1,
        statsRawJson: null,
      }),
    ).toBe(false);
  });

  it("returns the next regular-season games in schedule order", () => {
    const result = selectUpcomingScheduleGames(
      [
        game("c", 2, 1),
        game("a", 1, 2),
        game("b", 1, 1),
        game("d", 2, 2),
        game("done", 1, 3, "regular", true),
      ],
      4,
    );

    expect(result.phase).toBe("regular");
    expect(result.games.map((entry) => entry.game.id)).toEqual([
      "b",
      "a",
      "c",
      "d",
    ]);
  });

  it("prefers upcoming playoff games when any remain", () => {
    const result = selectUpcomingScheduleGames(
      [
        game("reg", 3, 1, "regular"),
        game("po1", 1, 1, "playoffs"),
        game("po2", 1, 2, "playoffs"),
        game("po-done", 1, 3, "playoffs", true),
      ],
      4,
    );

    expect(result.phase).toBe("playoffs");
    expect(result.games.map((entry) => entry.game.id)).toEqual(["po1", "po2"]);
  });
});
