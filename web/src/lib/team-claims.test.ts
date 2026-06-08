import { describe, expect, it } from "vitest";
import { canUserClaimTeam } from "@/lib/team-claims";

describe("team-claims", () => {
  const user = { id: "u1", username: "Zomsoth" };

  it("allows open unassigned teams", () => {
    expect(
      canUserClaimTeam(
        {
          id: "t1",
          seasonId: "s1",
          name: "Team",
          homeStadiumGameId: null,
          claimUsername: null,
          managerUserId: null,
        },
        user,
        false,
      ),
    ).toBe(true);
  });

  it("respects reserved username", () => {
    expect(
      canUserClaimTeam(
        {
          id: "t1",
          seasonId: "s1",
          name: "Team",
          homeStadiumGameId: null,
          claimUsername: "Zomsoth",
          managerUserId: null,
        },
        user,
        false,
      ),
    ).toBe(true);

    expect(
      canUserClaimTeam(
        {
          id: "t1",
          seasonId: "s1",
          name: "Team",
          homeStadiumGameId: null,
          claimUsername: "other",
          managerUserId: null,
        },
        user,
        false,
      ),
    ).toBe(false);
  });

  it("blocks when user already manages a team in season", () => {
    expect(
      canUserClaimTeam(
        {
          id: "t1",
          seasonId: "s1",
          name: "Team",
          homeStadiumGameId: null,
          claimUsername: null,
          managerUserId: null,
        },
        user,
        true,
      ),
    ).toBe(false);
  });
});
