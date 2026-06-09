import { describe, expect, it } from "vitest";
import { matchNetplayTeams } from "./match-netplay-teams";

const homeTeam = {
  teamId: "home-id",
  teamName: "Mario Stars",
  manager: {
    username: "zomsoth",
    displayName: "Zomsoth",
    netplayUsername: "Zomsoth",
  },
};

const awayTeam = {
  teamId: "away-id",
  teamName: "Bowser Bash",
  manager: {
    username: "bottomfragger",
    displayName: null,
    netplayUsername: null,
  },
};

describe("matchNetplayTeams", () => {
  it("accepts direct alignment when both managers match JSON home/away players", () => {
    const result = matchNetplayTeams(
      {
        homePlayer: "Zomsoth",
        awayPlayer: "bottomfragger",
        homeScore: 12,
        awayScore: 14,
      },
      homeTeam,
      awayTeam,
    );
    expect(result.alignment).toBe("direct");
    expect(result.blockingError).toBeNull();
    expect(result.scheduleHomeScore).toBe(12);
    expect(result.scheduleAwayScore).toBe(14);
    expect(result.homeSideTeamId).toBe("home-id");
    expect(result.awaySideTeamId).toBe("away-id");
  });

  it("auto-corrects when schedule home/away is reversed vs JSON", () => {
    const result = matchNetplayTeams(
      {
        homePlayer: "Zomsoth",
        awayPlayer: "bottomfragger",
        homeScore: 12,
        awayScore: 14,
      },
      awayTeam,
      homeTeam,
    );
    expect(result.alignment).toBe("swapped");
    expect(result.blockingError).toBeNull();
    expect(result.scheduleHomeScore).toBe(14);
    expect(result.scheduleAwayScore).toBe(12);
    expect(result.homeSideTeamId).toBe("home-id");
    expect(result.awaySideTeamId).toBe("away-id");
  });

  it("uses JSON away player for the other team when only home player matches an account", () => {
    const result = matchNetplayTeams(
      {
        homePlayer: "Zomsoth",
        awayPlayer: "NotRegisteredYet",
        homeScore: 5,
        awayScore: 3,
      },
      homeTeam,
      {
        ...awayTeam,
        manager: null,
      },
    );
    expect(result.blockingError).toBeNull();
    expect(result.alignment).toBe("partial");
    expect(result.homeSideTeamId).toBe("home-id");
    expect(result.awaySideTeamId).toBe("away-id");
    expect(result.scheduleHomeScore).toBe(5);
    expect(result.scheduleAwayScore).toBe(3);
  });

  it("uses JSON home player when only away manager matches an account", () => {
    const result = matchNetplayTeams(
      {
        homePlayer: "NotRegisteredYet",
        awayPlayer: "bottomfragger",
        homeScore: 5,
        awayScore: 3,
      },
      {
        ...homeTeam,
        manager: null,
      },
      awayTeam,
    );
    expect(result.blockingError).toBeNull();
    expect(result.homeSideTeamId).toBe("home-id");
    expect(result.awaySideTeamId).toBe("away-id");
    expect(result.scheduleHomeScore).toBe(5);
    expect(result.scheduleAwayScore).toBe(3);
  });

  it("blocks when names do not match either manager", () => {
    const result = matchNetplayTeams(
      {
        homePlayer: "SomeoneElse",
        awayPlayer: "AnotherPerson",
        homeScore: 3,
        awayScore: 2,
      },
      homeTeam,
      awayTeam,
    );
    expect(result.alignment).toBe("partial");
    expect(result.blockingError).not.toBeNull();
  });

  it("uses JSON roster characters when netplay names are unavailable", () => {
    const result = matchNetplayTeams(
      {
        homePlayer: "NotRegisteredYet",
        awayPlayer: "AlsoUnknown",
        homeScore: 4,
        awayScore: 2,
      },
      homeTeam,
      {
        ...awayTeam,
        manager: null,
      },
      {
        awayCharIds: ["Mario", "Luigi", "Peach", "Daisy", "Yoshi"],
        homeCharIds: ["Bowser", "Wario", "Waluigi", "Wario", "DK"],
        teamRosters: [
          { teamId: "home-id", charIds: ["Bowser", "Wario", "Waluigi", "DK"] },
          { teamId: "away-id", charIds: ["Mario", "Luigi", "Peach", "Daisy", "Yoshi"] },
        ],
      },
    );

    expect(result.blockingError).toBeNull();
    expect(result.homeSideTeamId).toBe("home-id");
    expect(result.awaySideTeamId).toBe("away-id");
  });
});
