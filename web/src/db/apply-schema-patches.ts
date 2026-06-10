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
}
