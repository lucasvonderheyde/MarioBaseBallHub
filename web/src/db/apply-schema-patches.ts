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
}
