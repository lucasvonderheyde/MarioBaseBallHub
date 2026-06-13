import type Database from "better-sqlite3";

/** Add columns introduced after initial deploys (safe to run repeatedly). */
export function applySqliteSchemaPatches(sqlite: Database.Database): void {
  const seasonColumns = sqlite
    .prepare("PRAGMA table_info(seasons)")
    .all() as { name: string }[];

  if (!seasonColumns.some((column) => column.name === "award_voting_open")) {
    sqlite.exec(
      "ALTER TABLE seasons ADD COLUMN award_voting_open integer NOT NULL DEFAULT 0",
    );
  }

  const scheduleColumns = sqlite
    .prepare("PRAGMA table_info(schedule_games)")
    .all() as { name: string }[];

  if (!scheduleColumns.some((column) => column.name === "stats_away_team_id")) {
    sqlite.exec("ALTER TABLE schedule_games ADD COLUMN stats_away_team_id text");
  }
  if (!scheduleColumns.some((column) => column.name === "stats_home_team_id")) {
    sqlite.exec("ALTER TABLE schedule_games ADD COLUMN stats_home_team_id text");
  }
  if (!scheduleColumns.some((column) => column.name === "stats_away_player")) {
    sqlite.exec("ALTER TABLE schedule_games ADD COLUMN stats_away_player text");
  }
  if (!scheduleColumns.some((column) => column.name === "stats_home_player")) {
    sqlite.exec("ALTER TABLE schedule_games ADD COLUMN stats_home_player text");
  }

  const statColumns = sqlite
    .prepare("PRAGMA table_info(character_game_stats)")
    .all() as { name: string }[];

  if (!statColumns.some((column) => column.name === "pitching_role")) {
    sqlite.exec("ALTER TABLE character_game_stats ADD COLUMN pitching_role text");
  }
  if (!statColumns.some((column) => column.name === "fielding_by_position_json")) {
    sqlite.exec("ALTER TABLE character_game_stats ADD COLUMN fielding_by_position_json text");
  }
  if (!statColumns.some((column) => column.name === "fielding_outs")) {
    sqlite.exec(
      "ALTER TABLE character_game_stats ADD COLUMN fielding_outs integer NOT NULL DEFAULT 0",
    );
  }
  if (!statColumns.some((column) => column.name === "fielding_batters")) {
    sqlite.exec(
      "ALTER TABLE character_game_stats ADD COLUMN fielding_batters integer NOT NULL DEFAULT 0",
    );
  }
  if (!statColumns.some((column) => column.name === "longest_hr_distance")) {
    sqlite.exec("ALTER TABLE character_game_stats ADD COLUMN longest_hr_distance integer");
  }

  const draftColumns = sqlite
    .prepare("PRAGMA table_info(season_drafts)")
    .all() as { name: string }[];

  if (!draftColumns.some((column) => column.name === "pick_clock_seconds")) {
    sqlite.exec("ALTER TABLE season_drafts ADD COLUMN pick_clock_seconds integer");
  }
  if (!draftColumns.some((column) => column.name === "current_pick_started_at")) {
    sqlite.exec(
      "ALTER TABLE season_drafts ADD COLUMN current_pick_started_at integer",
    );
  }

  const postColumns = sqlite
    .prepare("PRAGMA table_info(league_posts)")
    .all() as { name: string }[];

  if (postColumns.length > 0) {
    if (!postColumns.some((column) => column.name === "post_type")) {
      sqlite.exec(
        "ALTER TABLE league_posts ADD COLUMN post_type text NOT NULL DEFAULT 'season_recap'",
      );
    }
    if (!postColumns.some((column) => column.name === "related_game_id")) {
      sqlite.exec("ALTER TABLE league_posts ADD COLUMN related_game_id text");
    }
    if (!postColumns.some((column) => column.name === "series_key")) {
      sqlite.exec("ALTER TABLE league_posts ADD COLUMN series_key text");
    }
    if (!postColumns.some((column) => column.name === "week_number")) {
      sqlite.exec("ALTER TABLE league_posts ADD COLUMN week_number integer");
    }
  }
}
