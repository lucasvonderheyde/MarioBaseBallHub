import { describe, expect, it } from "vitest";
import { matchTeamsByRosterOverlap } from "./roster-team-match";

describe("matchTeamsByRosterOverlap", () => {
  const scheduleHomeTeamId = "team-home";
  const scheduleAwayTeamId = "team-away";

  it("maps JSON away/home rosters to the matching season lineups", () => {
    const result = matchTeamsByRosterOverlap(
      ["Mario", "Luigi", "Peach"],
      ["Bowser", "Wario", "Waluigi"],
      scheduleHomeTeamId,
      scheduleAwayTeamId,
      [
        { teamId: scheduleHomeTeamId, charIds: ["Bowser", "Wario", "Waluigi"] },
        { teamId: scheduleAwayTeamId, charIds: ["Mario", "Luigi", "Peach"] },
      ],
    );

    expect(result).toEqual({
      awaySideTeamId: scheduleAwayTeamId,
      homeSideTeamId: scheduleHomeTeamId,
      score: 6,
    });
  });

  it("detects swapped schedule sides from roster overlap", () => {
    const result = matchTeamsByRosterOverlap(
      ["Mario", "Luigi", "Peach"],
      ["Bowser", "Wario", "Waluigi"],
      scheduleAwayTeamId,
      scheduleHomeTeamId,
      [
        { teamId: scheduleHomeTeamId, charIds: ["Bowser", "Wario", "Waluigi"] },
        { teamId: scheduleAwayTeamId, charIds: ["Mario", "Luigi", "Peach"] },
      ],
    );

    expect(result).toEqual({
      awaySideTeamId: scheduleAwayTeamId,
      homeSideTeamId: scheduleHomeTeamId,
      score: 6,
    });
  });
});
