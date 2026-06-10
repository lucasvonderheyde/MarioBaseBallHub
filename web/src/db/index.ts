import fs from "fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";
import { applySqliteSchemaPatches } from "./apply-schema-patches";
import { isNextProductionBuild } from "./build-phase";
import { resolveDbPath } from "./resolve-db-path";
import { createSqliteBackup } from "./sqlite-backup";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __msbSqlite?: Database.Database;
  __msbDrizzle?: DrizzleDb;
};

function connectionPath(): string {
  if (isNextProductionBuild()) {
    return ":memory:";
  }
  return resolveDbPath();
}

function openSqlite(): Database.Database {
  const dbPath = connectionPath();
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  if (dbPath !== ":memory:") {
    applySqliteSchemaPatches(sqlite);
  }
  return sqlite;
}

function getSqlite(): Database.Database {
  if (!globalForDb.__msbSqlite) {
    globalForDb.__msbSqlite = openSqlite();
  }
  return globalForDb.__msbSqlite;
}

function getDb(): DrizzleDb {
  if (!globalForDb.__msbDrizzle) {
    globalForDb.__msbDrizzle = drizzle(getSqlite(), { schema });
  }
  return globalForDb.__msbDrizzle;
}

export const db = getDb();
export type Db = typeof db;

/** Snapshot the live database (safe to call during server actions). */
export async function backupLiveDatabase(reason: string): Promise<string | null> {
  const dbPath = connectionPath();
  if (dbPath === ":memory:") return null;
  const backupPath = await createSqliteBackup(dbPath, reason, { sqlite: getSqlite() });
  if (backupPath) {
    console.log(`[database] Backup created (${reason}): ${backupPath}`);
  }
  return backupPath;
}
