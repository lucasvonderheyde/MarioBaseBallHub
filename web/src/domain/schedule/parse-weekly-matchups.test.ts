import { describe, expect, it } from "vitest";
import { parseWeeklyMatchupsText } from "./parse-weekly-matchups";

describe("parseWeeklyMatchupsText", () => {
  const teams = new Map([
    ["Mario Stars", "id-mario"],
    ["Luigi's Crew", "id-luigi"],
    ["Bowser Bash", "id-bowser"],
  ]);

  it("parses @ and vs lines", () => {
    const { matchups, errors } = parseWeeklyMatchupsText(
      "Mario Stars @ Luigi's Crew\nBowser Bash vs Mario Stars",
      teams,
    );
    expect(errors).toEqual([]);
    expect(matchups).toEqual([
      { awayTeamId: "id-mario", homeTeamId: "id-luigi" },
      { awayTeamId: "id-bowser", homeTeamId: "id-mario" },
    ]);
  });

  it("matches team names case-insensitively", () => {
    const { matchups, errors } = parseWeeklyMatchupsText(
      "mario stars @ bowser bash",
      teams,
    );
    expect(errors).toEqual([]);
    expect(matchups).toHaveLength(1);
  });

  it("reports unknown teams and bad lines", () => {
    const { matchups, errors } = parseWeeklyMatchupsText(
      "Unknown @ Mario Stars\nnot a matchup",
      teams,
    );
    expect(matchups).toEqual([]);
    expect(errors.length).toBeGreaterThan(0);
  });
});
