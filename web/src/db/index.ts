import fs from "fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

/** Same file drizzle-kit uses: `web/data/league.db` (cwd must be `web/`). */
function resolveDbPath(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (raw) {
    const withoutScheme = raw.replace(/^file:/i, "");
    return path.isAbsolute(withoutScheme)
      ? withoutScheme
      : path.join(process.cwd(), withoutScheme.replace(/^\.\//, ""));
  }
  return path.join(process.cwd(), "data", "league.db");
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
