import { afterEach, describe, expect, it } from "vitest";
import {
  inkyAutoDraftGameEnabled,
  inkyAutoDraftSeriesEnabled,
} from "@/lib/inky-auto-draft-settings";

describe("inkyAutoDraftGameEnabled", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const originalAuto = process.env.INKY_AUTO_DRAFT_GAME;
  const originalSeries = process.env.INKY_AUTO_DRAFT_SERIES;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    if (originalAuto === undefined) delete process.env.INKY_AUTO_DRAFT_GAME;
    else process.env.INKY_AUTO_DRAFT_GAME = originalAuto;
    if (originalSeries === undefined) delete process.env.INKY_AUTO_DRAFT_SERIES;
    else process.env.INKY_AUTO_DRAFT_SERIES = originalSeries;
  });

  it("defaults on when Anthropic is configured", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.INKY_AUTO_DRAFT_GAME;
    expect(inkyAutoDraftGameEnabled()).toBe(true);
  });

  it("can be disabled explicitly", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.INKY_AUTO_DRAFT_GAME = "false";
    expect(inkyAutoDraftGameEnabled()).toBe(false);
  });

  it("defaults series auto-draft to game setting", () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.INKY_AUTO_DRAFT_GAME;
    delete process.env.INKY_AUTO_DRAFT_SERIES;
    expect(inkyAutoDraftSeriesEnabled()).toBe(true);
  });
});
