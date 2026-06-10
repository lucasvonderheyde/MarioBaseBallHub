import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { applySqliteSchemaPatches } from "./apply-schema-patches";

describe("applySqliteSchemaPatches", () => {
  it("adds award_voting_open when missing", () => {
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
    `);

    applySqliteSchemaPatches(sqlite);

    const columns = sqlite
      .prepare("PRAGMA table_info(seasons)")
      .all() as { name: string }[];
    expect(columns.some((column) => column.name === "award_voting_open")).toBe(
      true,
    );

    sqlite.close();
  });
});
