import { describe, expect, it } from "vitest";
import {
  classifyPitchingRoles,
  findStarterSlotsFromEvents,
  pitchingRoleKey,
  type PitcherAppearance,
} from "./classify-pitching-roles";

function appearance(
  teamSide: "Away" | "Home",
  rosterSlot: number,
  outsPitched: number,
): PitcherAppearance {
  return { teamSide, rosterSlot, wasPitcher: true, outsPitched };
}

const eventsData = {
  Events: [
    { "Event Num": 0, "Half Inning": 0, "Pitcher Roster Loc": 5 },
    { "Event Num": 1, "Half Inning": 0, "Pitcher Roster Loc": 5 },
    { "Event Num": 4, "Half Inning": 1, "Pitcher Roster Loc": 8 },
    { "Event Num": 30, "Half Inning": 0, "Pitcher Roster Loc": 6 },
  ],
};

describe("findStarterSlotsFromEvents", () => {
  it("uses the earliest event of each half to find starters", () => {
    expect(findStarterSlotsFromEvents(eventsData)).toEqual({
      homeStarterSlot: 5,
      awayStarterSlot: 8,
    });
  });

  it("returns nulls when events are missing", () => {
    expect(findStarterSlotsFromEvents({})).toEqual({
      homeStarterSlot: null,
      awayStarterSlot: null,
    });
  });
});

describe("classifyPitchingRoles", () => {
  it("marks the events starter even when a reliever pitched more outs", () => {
    // Mirrors real exports: home starter (slot 5) was pulled after 5 outs,
    // reliever (slot 6) threw 16.
    const roles = classifyPitchingRoles(
      [appearance("Home", 5, 5), appearance("Home", 6, 16), appearance("Away", 8, 21)],
      eventsData,
    );
    expect(roles.get(pitchingRoleKey("Home", 5))).toBe("starter");
    expect(roles.get(pitchingRoleKey("Home", 6))).toBe("reliever");
    expect(roles.get(pitchingRoleKey("Away", 8))).toBe("starter");
  });

  it("falls back to most outs when events are absent", () => {
    const roles = classifyPitchingRoles(
      [appearance("Home", 2, 11), appearance("Home", 6, 4)],
      {},
    );
    expect(roles.get(pitchingRoleKey("Home", 2))).toBe("starter");
    expect(roles.get(pitchingRoleKey("Home", 6))).toBe("reliever");
  });

  it("falls back when the events starter slot has no pitching appearance", () => {
    const roles = classifyPitchingRoles(
      [appearance("Home", 1, 9), appearance("Home", 3, 2)],
      eventsData,
    );
    expect(roles.get(pitchingRoleKey("Home", 1))).toBe("starter");
    expect(roles.get(pitchingRoleKey("Home", 3))).toBe("reliever");
  });

  it("classifies non-pitchers not at all", () => {
    const roles = classifyPitchingRoles(
      [{ teamSide: "Away", rosterSlot: 0, wasPitcher: false, outsPitched: 0 }],
      eventsData,
    );
    expect(roles.size).toBe(0);
  });
});
