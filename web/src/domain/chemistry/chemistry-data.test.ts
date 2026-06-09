import { describe, expect, it } from "vitest";
import {
  chemistryIndexForChar,
  chemistryValueBetweenChars,
} from "./chemistry-data";

describe("chemistry-data", () => {
  it("maps Mario and Luigi to a high chemistry value", () => {
    expect(chemistryValueBetweenChars("Mario", "Luigi")).toBe(99);
  });

  it("maps color variants to the same chemistry identity", () => {
    const green = chemistryIndexForChar("Toad(G)");
    const red = chemistryIndexForChar("Toad(R)");
    expect(green).not.toBeNull();
    expect(green).toBe(red);
  });
});
