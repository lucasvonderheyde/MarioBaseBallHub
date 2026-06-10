import { describe, expect, it } from "vitest";
import { batFileForCharId, iconFileForCharId } from "./character-assets";

describe("character asset lookups", () => {
  it("maps gameCharId to icon filenames", () => {
    expect(iconFileForCharId("Mario")).toBe("MarioIconMSSB.png");
    expect(iconFileForCharId("DK")).toBe("DonkeyKongIconMSSB.png");
  });

  it("uses bat filename convention with overrides", () => {
    expect(batFileForCharId("Mario")).toBe("Mario bat.png");
    expect(batFileForCharId("Hammer Bro")).toBe("Bro(H) bat.png");
  });
});
