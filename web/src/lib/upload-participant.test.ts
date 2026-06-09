import { describe, expect, it } from "vitest";
import {
  gameIdLinkError,
  isUserNetplayParticipantInFile,
  netplayParticipantError,
  resolveUserTeamSide,
} from "./upload-participant";

describe("isUserNetplayParticipantInFile", () => {
  it("matches netplay username against away or home", () => {
    expect(
      isUserNetplayParticipantInFile(
        { username: "zomsoth", netplayUsername: "Zomsoth" },
        "bottomfragger",
        "Zomsoth",
      ),
    ).toBe(true);
    expect(
      isUserNetplayParticipantInFile(
        { username: "zomsoth", netplayUsername: "Zomsoth" },
        "Zomsoth",
        "other",
      ),
    ).toBe(true);
  });

  it("rejects unrelated users", () => {
    expect(
      isUserNetplayParticipantInFile(
        { username: "alice", netplayUsername: "Alice" },
        "bob",
        "carol",
      ),
    ).toBe(false);
  });
});

describe("netplayParticipantError", () => {
  it("allows admins without file match", () => {
    expect(
      netplayParticipantError(
        { username: "admin" },
        "admin",
        "a",
        "b",
      ),
    ).toBeNull();
  });

  it("requires managers to be in the file", () => {
    expect(
      netplayParticipantError(
        { username: "zomsoth", netplayUsername: "Zomsoth" },
        "manager",
        "other",
        "player",
      ),
    ).toMatch(/Account page/);
  });
});

describe("resolveUserTeamSide", () => {
  it("returns the side that matches the user netplay label", () => {
    expect(
      resolveUserTeamSide(
        { username: "zomsoth", netplayUsername: "Zomsoth" },
        "other",
        "Zomsoth",
      ),
    ).toBe("Home");
    expect(
      resolveUserTeamSide(
        { username: "zomsoth", netplayUsername: "Zomsoth" },
        "Zomsoth",
        "other",
      ),
    ).toBe("Away");
  });
});

describe("gameIdLinkError", () => {
  it("allows re-upload to the same game", () => {
    expect(gameIdLinkError("gid-1", "game-a", "game-a")).toBeNull();
  });

  it("blocks linking GameID to a second game", () => {
    expect(gameIdLinkError("gid-1", "game-b", "game-a")).toMatch(/already linked/);
  });

  it("allows first upload", () => {
    expect(gameIdLinkError("gid-1", "game-a", undefined)).toBeNull();
  });
});
