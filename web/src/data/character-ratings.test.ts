import { describe, expect, it } from "vitest";
import { CHARACTER_CATALOG } from "@/data/character-catalog";
import { getCharacterRatings } from "@/data/character-ratings";

describe("getCharacterRatings", () => {
  it("maps every catalog character to CSV ratings", () => {
    const missing = CHARACTER_CATALOG.filter(
      (row) => getCharacterRatings(row.gameCharId) == null,
    ).map((row) => row.gameCharId);

    expect(missing).toEqual([]);
  });

  it("resolves display-name aliases used in the stats sheet", () => {
    expect(getCharacterRatings("Paratroopa(R)")?.characterClass).toBe("Technique");
    expect(getCharacterRatings("Paratroopa(G)")?.starSwing).toBe("Line Drive");
    expect(getCharacterRatings("Dry Bones(Gy)")?.characterClass).toBe("Technique");
    expect(getCharacterRatings("Wario")?.characterClass).toBe("Power");
  });
});
