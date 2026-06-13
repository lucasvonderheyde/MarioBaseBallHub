import { afterEach, describe, expect, it } from "vitest";
import {
  gameRecapPageHref,
  leaguePostAbsoluteUrl,
  leaguePostPageHref,
} from "@/lib/league-news-links";

describe("league-news-links", () => {
  const originalAppUrl = process.env.APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalAppUrl;
  });

  it("builds article and game recap paths", () => {
    expect(leaguePostPageHref("league-1", "season-1", "post-1")).toBe(
      "/leagues/league-1/seasons/season-1/news/post-1",
    );
    expect(gameRecapPageHref("league-1", "season-1", "game-1")).toBe(
      "/leagues/league-1/seasons/season-1/games/game-1#inky-recap",
    );
  });

  it("builds absolute article URLs from APP_URL", () => {
    process.env.APP_URL = "https://example.com";
    expect(leaguePostAbsoluteUrl("league-1", "season-1", "post-1")).toBe(
      "https://example.com/leagues/league-1/seasons/season-1/news/post-1",
    );
  });
});
