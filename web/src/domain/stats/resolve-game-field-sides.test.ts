import { describe, expect, it } from "vitest";
import {
  isTeamHomeInGame,
  resolveGameFieldSides,
  teamScheduleScores,
} from "./resolve-game-field-sides";

const scheduleGame = {
  homeTeamId: "team-home",
  awayTeamId: "team-away",
  statsAwayTeamId: null,
  statsHomeTeamId: null,
  statsAwayPlayer: null,
  statsHomePlayer: null,
};

describe("resolveGameFieldSides", () => {
  it("uses stored stats sides when present", () => {
    const sides = resolveGameFieldSides({
      ...scheduleGame,
      statsAwayTeamId: "team-b",
      statsHomeTeamId: "team-a",
      statsAwayPlayer: "PlayerB",
      statsHomePlayer: "PlayerA",
    });

    expect(sides).toEqual({
      awayTeamId: "team-b",
      homeTeamId: "team-a",
      awayPlayer: "PlayerB",
      homePlayer: "PlayerA",
      fromStats: true,
    });
  });

  it("falls back to schedule slots when stats sides are missing", () => {
    expect(resolveGameFieldSides(scheduleGame)).toEqual({
      awayTeamId: "team-away",
      homeTeamId: "team-home",
      awayPlayer: null,
      homePlayer: null,
      fromStats: false,
    });
  });
});

describe("teamScheduleScores", () => {
  const swappedSides = {
    awayTeamId: "team-home",
    homeTeamId: "team-away",
    awayPlayer: "HomePlayer",
    homePlayer: "AwayPlayer",
    fromStats: true,
  };

  it("maps the stored home score to the scheduled home team even when field sides flipped", () => {
    expect(teamScheduleScores("team-home", scheduleGame, 10, 0)).toEqual({
      ours: 0,
      theirs: 10,
    });
  });

  it("maps the stored away score to the scheduled away team", () => {
    expect(teamScheduleScores("team-away", scheduleGame, 10, 0)).toEqual({
      ours: 10,
      theirs: 0,
    });
  });

  it("returns null for a team not in the game", () => {
    expect(teamScheduleScores("someone-else", scheduleGame, 10, 0)).toBeNull();
  });

  it("identifies home field from JSON sides", () => {
    expect(isTeamHomeInGame("team-away", swappedSides)).toBe(true);
    expect(isTeamHomeInGame("team-home", swappedSides)).toBe(false);
  });
});
