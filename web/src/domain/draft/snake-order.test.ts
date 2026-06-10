import { describe, expect, it } from "vitest";
import { teamIdForPickIndex } from "./snake-order";

describe("teamIdForPickIndex", () => {
  const order = ["a", "b", "c", "d"];

  it("snakes back on the second round", () => {
    expect(teamIdForPickIndex(order, 0)).toBe("a");
    expect(teamIdForPickIndex(order, 3)).toBe("d");
    expect(teamIdForPickIndex(order, 4)).toBe("d");
    expect(teamIdForPickIndex(order, 7)).toBe("a");
  });
});
