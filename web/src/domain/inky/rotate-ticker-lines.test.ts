import { describe, expect, it } from "vitest";
import { rotateTickerLines } from "@/domain/inky/rotate-ticker-lines";

describe("rotateTickerLines", () => {
  it("returns all lines when under the max", () => {
    expect(rotateTickerLines(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });

  it("rotates lines based on seed", () => {
    const lines = ["a", "b", "c", "d", "e"];
    expect(rotateTickerLines(lines, 3, 0)).toEqual(["a", "b", "c"]);
    expect(rotateTickerLines(lines, 3, 2)).toEqual(["c", "d", "e"]);
  });
});
