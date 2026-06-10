import fs from "fs";
import path from "path";

/** Known SQLite locations when deploying on Railway (volume mount varies by root directory). */
export const RAILWAY_DB_CANDIDATES = [
  "/app/data/league.db",
  "/app/web/data/league.db",
] as const;

const MIN_EXISTING_DB_BYTES = 4096;

function statDbFile(filePath: string): { exists: boolean; sizeBytes: number } {
  try {
    const stat = fs.statSync(filePath);
    return { exists: stat.isFile(), sizeBytes: stat.size };
  } catch {
    return { exists: false, sizeBytes: 0 };
  }
}

/** True when DATABASE_URL looks like postgres/mysql/etc. instead of a SQLite file path. */
export function isRemoteDatabaseUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || /^file:/i.test(trimmed)) return false;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
}

function pathFromDatabaseUrl(raw: string, cwd: string): string {
  const withoutScheme = raw.replace(/^file:/i, "");
  return path.isAbsolute(withoutScheme)
    ? withoutScheme
    : path.join(cwd, withoutScheme.replace(/^\.\//, ""));
}

/** Resolves the configured SQLite path from DATABASE_URL (does not apply Railway fallbacks). */
export function resolveConfiguredDbPath(cwd = process.cwd()): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (raw) {
    if (isRemoteDatabaseUrl(raw)) {
      throw new Error(
        `DATABASE_URL must be a SQLite file path (e.g. file:/app/data/league.db). ` +
          `Got a remote database URL (${raw.split("://")[0]}://…). ` +
          `Remove Railway PostgreSQL/MySQL variables — this app uses SQLite on a volume.`,
      );
    }
    return pathFromDatabaseUrl(raw, cwd);
  }
  return path.join(cwd, "data", "league.db");
}

function pickRailwayDbPath(configuredPath: string): string {
  if (!process.env.RAILWAY_ENVIRONMENT) return configuredPath;

  const configured = statDbFile(configuredPath);
  if (configured.exists && configured.sizeBytes >= MIN_EXISTING_DB_BYTES) {
    return configuredPath;
  }

  for (const candidate of RAILWAY_DB_CANDIDATES) {
    if (candidate === configuredPath) continue;
    const alt = statDbFile(candidate);
    if (alt.exists && alt.sizeBytes >= MIN_EXISTING_DB_BYTES) {
      console.warn(
        `[database] DATABASE_URL points to ${configuredPath} (${configured.sizeBytes} bytes) ` +
          `but found existing data at ${candidate} (${alt.sizeBytes} bytes). ` +
          `Using ${candidate}. Set DATABASE_URL=file:${candidate} and align the volume mount.`,
      );
      return candidate;
    }
  }

  return configuredPath;
}

/** Resolves SQLite file path from DATABASE_URL (file:…) or default `data/league.db` (cwd = web/). */
export function resolveDbPath(cwd = process.cwd()): string {
  const configuredPath = resolveConfiguredDbPath(cwd);
  return pickRailwayDbPath(configuredPath);
}
