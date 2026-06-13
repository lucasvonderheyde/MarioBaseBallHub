import { describe, expect, it } from "vitest";
import {
  mergePositionMaps,
  parseFieldingByPosition,
  parsePositionArray,
  primaryFieldingPosition,
  sumPositionMap,
} from "./fielding-by-position";

describe("fielding-by-position", () => {
  it("merges position array entries", () => {
    expect(parsePositionArray([{ CF: 46 }, { LF: 2 }])).toEqual({ CF: 46, LF: 2 });
  });

  it("parses defensive stats block", () => {
    const fielding = parseFieldingByPosition({
      "Outs Per Position": [{ CF: 2 }],
      "Batter Outs Per Position": [{ CF: 27 }],
      "Batters Per Position": [{ CF: 46 }],
    });
    expect(fielding.outs.CF).toBe(2);
    expect(fielding.batterOuts.CF).toBe(27);
    expect(fielding.batters.CF).toBe(46);
    expect(primaryFieldingPosition(fielding.batters)).toBe("CF");
  });

  it("sums and merges position maps", () => {
    const left = { SS: 3, CF: 1 } as const;
    const right = { SS: 1, LF: 4 } as const;
    expect(sumPositionMap(left)).toBe(4);
    expect(mergePositionMaps(left, right)).toEqual({ SS: 4, CF: 1, LF: 4 });
  });
});
