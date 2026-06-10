import { describe, expect, it } from "vitest";
import { seasonAdminPath } from "./season-admin-path";

describe("seasonAdminPath", () => {
  it("builds the admin settings URL", () => {
    expect(seasonAdminPath("league-1", "season-2")).toBe(
      "/leagues/league-1/seasons/season-2/admin",
    );
  });

  it("appends query params", () => {
    expect(
      seasonAdminPath("league-1", "season-2", {
        m: "team-created",
        count: 3,
        empty: "",
      }),
    ).toBe("/leagues/league-1/seasons/season-2/admin?m=team-created&count=3");
  });
});
