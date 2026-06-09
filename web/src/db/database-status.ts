import fs from "fs";
import path from "path";
import { resolveDbPath } from "./resolve-db-path";

const RAILWAY_VOLUME_PATHS = ["/app/data", "/app/web/data"];

export type DatabaseStatus = {
  path: string;
  configuredUrl: string | null;
  exists: boolean;
  sizeBytes: number | null;
  looksPersistent: boolean;
  warnings: string[];
};

export function getDatabaseStatus(cwd = process.cwd()): DatabaseStatus {
  const configuredUrl = process.env.DATABASE_URL?.trim() ?? null;
  const dbPath = resolveDbPath(cwd);
  const warnings: string[] = [];

  if (process.env.NODE_ENV === "production") {
    if (!configuredUrl) {
      warnings.push(
        "DATABASE_URL is not set. SQLite defaults to ./data/league.db inside the container, which is wiped on every deploy.",
      );
    } else {
      const withoutScheme = configuredUrl.replace(/^file:/i, "");
      if (!path.isAbsolute(withoutScheme)) {
        warnings.push(
          "DATABASE_URL should use an absolute path on the Railway volume, e.g. file:/app/data/league.db.",
        );
      }
    }

    const looksPersistent = RAILWAY_VOLUME_PATHS.some(
      (prefix) => dbPath === prefix || dbPath.startsWith(`${prefix}/`),
    );
    if (!looksPersistent) {
      warnings.push(
        `Database file is at ${dbPath}. For Railway, mount a volume and use file:/app/data/league.db (Root Directory = web).`,
      );
    }
  }

  let exists = false;
  let sizeBytes: number | null = null;
  try {
    const stat = fs.statSync(dbPath);
    exists = stat.isFile();
    sizeBytes = stat.size;
  } catch {
    exists = false;
  }

  return {
    path: dbPath,
    configuredUrl,
    exists,
    sizeBytes,
    looksPersistent: RAILWAY_VOLUME_PATHS.some(
      (prefix) => dbPath === prefix || dbPath.startsWith(`${prefix}/`),
    ),
    warnings,
  };
}

export function logDatabaseStatus(cwd = process.cwd()): DatabaseStatus {
  const status = getDatabaseStatus(cwd);
  console.log(`[database] path=${status.path} exists=${status.exists} size=${status.sizeBytes ?? 0}`);
  if (status.configuredUrl) {
    console.log(`[database] DATABASE_URL=${status.configuredUrl}`);
  }
  for (const warning of status.warnings) {
    console.warn(`[database] WARNING: ${warning}`);
  }
  return status;
}
