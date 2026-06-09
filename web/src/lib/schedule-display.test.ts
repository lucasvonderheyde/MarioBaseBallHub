import { describe, expect, it } from "vitest";
import {
  scheduleGameCardStatus,
  scheduleStatusLabel,
  toScheduleGameDisplay,
} from "./schedule-display";

const baseGame = {
  id: "game-1",
  roundId: "round-1",
  slotInRound: 1,
  homeTeamId: "home",
  awayTeamId: "away",
  homeScore: null,
  awayScore: null,
  youtubeUrl: null,
  statsGameId: null,
  statsRawJson: null,
  statsStadiumId: null,
  playedAt: null,
  agreedPlayAt: null,
};

describe("schedule display", () => {
  it("marks completed games from scores or stats", () => {
    const played = toScheduleGameDisplay({
      ...baseGame,
      homeScore: 3,
      awayScore: 2,
    });
    expect(scheduleGameCardStatus(played)).toBe("played");
    expect(scheduleStatusLabel("played")).toBe("Completed");
  });

  it("marks agreed times separately from open matchups", () => {
    const agreed = toScheduleGameDisplay({
      ...baseGame,
      agreedPlayAt: new Date("2026-06-10T18:00:00Z"),
    });
    expect(scheduleGameCardStatus(agreed)).toBe("time_agreed");
    expect(scheduleStatusLabel("time_agreed")).toBe("Time agreed");

    const open = toScheduleGameDisplay(baseGame);
    expect(scheduleGameCardStatus(open)).toBe("awaiting_time");
    expect(scheduleStatusLabel("awaiting_time")).toBe("Awaiting time");
  });
});
