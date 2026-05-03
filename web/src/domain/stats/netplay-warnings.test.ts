import { describe, expect, it } from "vitest";
import { netplayLabelWarnings } from "./netplay-warnings";

describe("netplayLabelWarnings", () => {
  it("returns empty when managers unset", () => {
    expect(
      netplayLabelWarnings(
        { homePlayer: "A", awayPlayer: "B" },
        null,
        null,
      ),
    ).toEqual([]);
  });

  it("warns on mismatch", () => {
    const w = netplayLabelWarnings(
      { homePlayer: "FileHome", awayPlayer: "FileAway" },
      "DbHome",
      "FileAway",
    );
    expect(w).toHaveLength(1);
    expect(w[0]).toContain("Home netplay");
  });
});
