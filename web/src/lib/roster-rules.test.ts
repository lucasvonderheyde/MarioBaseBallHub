import { describe, expect, it } from "vitest";
import {
  MIN_TEAM_ROSTER_SIZE,
  rosterCountAfterTrade,
  rosterCountMeetsMinimum,
  minimumRosterError,
} from "./roster-rules";

describe("roster rules", () => {
  it("requires at least nine roster rows per team", () => {
    expect(MIN_TEAM_ROSTER_SIZE).toBe(9);
    expect(rosterCountMeetsMinimum(9)).toBe(true);
    expect(rosterCountMeetsMinimum(8)).toBe(false);
  });

  it("validates roster counts after a trade", () => {
    expect(rosterCountAfterTrade(10, 2, 1)).toBe(9);
    expect(rosterCountAfterTrade(9, 1, 0)).toBe(8);
  });

  it("describes minimum roster errors", () => {
    expect(minimumRosterError("Braves")).toContain("Braves");
    expect(minimumRosterError("Braves")).toContain("9");
  });
});
