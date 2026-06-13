import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { applySqliteSchemaPatches } from "./apply-schema-patches";

describe("applySqliteSchemaPatches", () => {
  it("adds missing columns to seasons and schedule_games", () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE seasons (
        id text PRIMARY KEY,
        league_id text NOT NULL,
        name text NOT NULL,
        status text NOT NULL,
        tiebreaker_order text NOT NULL,
        created_at integer NOT NULL
      );
      CREATE TABLE schedule_games (
        id text PRIMARY KEY,
        round_id text NOT NULL,
        slot_in_round integer NOT NULL,
        home_team_id text NOT NULL,
        away_team_id text NOT NULL
      );
      CREATE TABLE character_game_stats (
        id text PRIMARY KEY,
        game_id text NOT NULL,
        char_id text NOT NULL
      );
      CREATE TABLE season_drafts (
        season_id text PRIMARY KEY,
        status text NOT NULL,
        team_order_json text NOT NULL,
        current_pick_index integer NOT NULL,
        picks_per_team integer NOT NULL
      );
      CREATE TABLE league_posts (
        id text PRIMARY KEY,
        league_id text NOT NULL,
        season_id text,
        title text NOT NULL,
        body text NOT NULL,
        source text NOT NULL,
        status text NOT NULL DEFAULT 'draft'
      );
    `);

    applySqliteSchemaPatches(sqlite);

    const seasonColumns = sqlite
      .prepare("PRAGMA table_info(seasons)")
      .all() as { name: string }[];
    expect(
      seasonColumns.some((column) => column.name === "award_voting_open"),
    ).toBe(true);

    const scheduleColumns = sqlite
      .prepare("PRAGMA table_info(schedule_games)")
      .all() as { name: string }[];
    for (const patched of [
      "stats_away_team_id",
      "stats_home_team_id",
      "stats_away_player",
      "stats_home_player",
    ]) {
      expect(scheduleColumns.some((column) => column.name === patched)).toBe(
        true,
      );
    }

    const statColumns = sqlite
      .prepare("PRAGMA table_info(character_game_stats)")
      .all() as { name: string }[];
    expect(statColumns.some((column) => column.name === "pitching_role")).toBe(
      true,
    );

    const draftColumns = sqlite
      .prepare("PRAGMA table_info(season_drafts)")
      .all() as { name: string }[];
    expect(
      draftColumns.some((column) => column.name === "pick_clock_seconds"),
    ).toBe(true);
    expect(
      draftColumns.some((column) => column.name === "current_pick_started_at"),
    ).toBe(true);

    const postColumns = sqlite
      .prepare("PRAGMA table_info(league_posts)")
      .all() as { name: string }[];
    for (const patched of [
      "post_type",
      "related_game_id",
      "series_key",
      "week_number",
    ]) {
      expect(postColumns.some((column) => column.name === patched)).toBe(true);
    }

    sqlite.close();
  });
});
