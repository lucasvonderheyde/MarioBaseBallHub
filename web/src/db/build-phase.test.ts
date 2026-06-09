import { afterEach, describe, expect, it } from "vitest";
import { isNextProductionBuild } from "./build-phase";

describe("isNextProductionBuild", () => {
  const original = process.env.NEXT_PHASE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PHASE;
    } else {
      process.env.NEXT_PHASE = original;
    }
  });

  it("is true during next build page collection", () => {
    process.env.NEXT_PHASE = "phase-production-build";
    expect(isNextProductionBuild()).toBe(true);
  });

  it("is false at runtime", () => {
    delete process.env.NEXT_PHASE;
    expect(isNextProductionBuild()).toBe(false);
  });
});
