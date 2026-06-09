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
  it("accepts direct alignment", () => {
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
    expect(result.awaySideTeamId).toBe("away-id");
    expect(result.homeSideTeamId).toBe("home-id");
  });

  it("auto-corrects swapped schedule home/away", () => {
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
    expect(result.awaySideTeamId).toBe("away-id");
    expect(result.homeSideTeamId).toBe("home-id");
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

  it("allows upload when only the home manager matches", () => {
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
    expect(result.scheduleHomeScore).toBe(5);
    expect(result.scheduleAwayScore).toBe(3);
  });

  it("allows upload when only one manager matches via swapped sides", () => {
    const result = matchNetplayTeams(
      {
        homePlayer: "Zomsoth",
        awayPlayer: "NotRegisteredYet",
        homeScore: 5,
        awayScore: 3,
      },
      awayTeam,
      homeTeam,
    );
    expect(result.blockingError).toBeNull();
    expect(result.alignment).toBe("partial");
    expect(result.scheduleHomeScore).toBe(3);
    expect(result.scheduleAwayScore).toBe(5);
  });
});
