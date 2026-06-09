import { describe, expect, it } from "vitest";
import {
  normalizeStadiumId,
  stadiumIdVariants,
  stadiumIdsMatch,
} from "./stadium-id";

describe("stadium-id", () => {
  it("maps DK Jungle JSON id to Donkey Kong Jungle catalog id", () => {
    expect(normalizeStadiumId("DK Jungle")).toBe("Donkey Kong Jungle");
  });

  it("passes through canonical catalog ids", () => {
    expect(normalizeStadiumId("Peach Garden")).toBe("Peach Garden");
    expect(normalizeStadiumId("Donkey Kong Jungle")).toBe("Donkey Kong Jungle");
  });

  it("returns variants for querying stored rows", () => {
    expect(stadiumIdVariants("Donkey Kong Jungle")).toEqual([
      "Donkey Kong Jungle",
      "DK Jungle",
    ]);
  });

  it("matches stored alias to canonical stadium", () => {
    expect(stadiumIdsMatch("DK Jungle", "Donkey Kong Jungle")).toBe(true);
    expect(stadiumIdsMatch("Peach Garden", "Donkey Kong Jungle")).toBe(false);
  });
});
