import fs from "fs";
import path from "path";
import {
  RAILWAY_DB_CANDIDATES,
  isRemoteDatabaseUrl,
  resolveConfiguredDbPath,
  resolveDbPath,
} from "./resolve-db-path";

const RAILWAY_VOLUME_PATHS = ["/app/data", "/app/web/data"];

export type AlternateDbFile = {
  path: string;
  exists: boolean;
  sizeBytes: number;
  isActive: boolean;
};

export type DatabaseStatus = {
  path: string;
  configuredPath: string;
  configuredUrl: string | null;
  cwd: string;
  isRailway: boolean;
  exists: boolean;
  sizeBytes: number | null;
  looksPersistent: boolean;
  invalidDatabaseUrl: boolean;
  alternateDbFiles: AlternateDbFile[];
  warnings: string[];
};

function statDbFile(filePath: string): { exists: boolean; sizeBytes: number } {
  try {
    const stat = fs.statSync(filePath);
    return { exists: stat.isFile(), sizeBytes: stat.size };
  } catch {
    return { exists: false, sizeBytes: 0 };
  }
}

function volumeDirExists(mountPath: string): boolean {
  try {
    return fs.statSync(mountPath).isDirectory();
  } catch {
    return false;
  }
}

export function getDatabaseStatus(cwd = process.cwd()): DatabaseStatus {
  const configuredUrl = process.env.DATABASE_URL?.trim() ?? null;
  const invalidDatabaseUrl = configuredUrl ? isRemoteDatabaseUrl(configuredUrl) : false;
  const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT);

  let configuredPath = "";
  let activePath = "";
  try {
    configuredPath = resolveConfiguredDbPath(cwd);
    activePath = resolveDbPath(cwd);
  } catch {
    configuredPath = path.join(cwd, "data", "league.db");
    activePath = configuredPath;
  }

  const warnings: string[] = [];

  if (invalidDatabaseUrl) {
    warnings.push(
      `DATABASE_URL is set to a remote database (${configuredUrl?.split("://")[0]}://…). ` +
        `This app requires SQLite. Set DATABASE_URL=file:/app/data/league.db and remove any Railway PostgreSQL/MySQL plugin variables.`,
    );
  }

  if (process.env.NODE_ENV === "production") {
    if (!configuredUrl) {
      warnings.push(
        "DATABASE_URL is not set. SQLite defaults to ./data/league.db inside the container, which is wiped on every deploy.",
      );
    } else if (!invalidDatabaseUrl) {
      const withoutScheme = configuredUrl.replace(/^file:/i, "");
      if (!path.isAbsolute(withoutScheme)) {
        warnings.push(
          "DATABASE_URL should use an absolute path on the Railway volume, e.g. file:/app/data/league.db.",
        );
      }
    }

    const looksPersistent = RAILWAY_VOLUME_PATHS.some(
      (prefix) => activePath === prefix || activePath.startsWith(`${prefix}/`),
    );
    if (!looksPersistent) {
      warnings.push(
        `Database file is at ${activePath}. For Railway, mount a volume and use file:/app/data/league.db (Root Directory = web).`,
      );
    }

    if (isRailway) {
      const volumeRoot = activePath.startsWith("/app/web/")
        ? "/app/web/data"
        : "/app/data";
      if (!volumeDirExists(volumeRoot)) {
        warnings.push(
          `Volume directory ${volumeRoot} is missing. In the Railway canvas, attach a volume to this service (Ctrl+K → Volume) with mount path ${volumeRoot}, then redeploy.`,
        );
      }
    }
  }

  if (
    isRailway &&
    configuredPath !== activePath &&
    !invalidDatabaseUrl
  ) {
    warnings.push(
      `Active database is ${activePath}, but DATABASE_URL resolves to ${configuredPath}. ` +
        `Update DATABASE_URL=file:${activePath} so future deploys use the same file.`,
    );
  }

  const candidatePaths = new Set<string>([
    configuredPath,
    activePath,
    ...RAILWAY_DB_CANDIDATES,
  ]);
  const alternateDbFiles: AlternateDbFile[] = [...candidatePaths].map(
    (candidate) => {
      const stat = statDbFile(candidate);
      return {
        path: candidate,
        exists: stat.exists,
        sizeBytes: stat.sizeBytes,
        isActive: candidate === activePath,
      };
    },
  );

  const activeStat = statDbFile(activePath);

  return {
    path: activePath,
    configuredPath,
    configuredUrl,
    cwd,
    isRailway,
    exists: activeStat.exists,
    sizeBytes: activeStat.exists ? activeStat.sizeBytes : null,
    looksPersistent: RAILWAY_VOLUME_PATHS.some(
      (prefix) => activePath === prefix || activePath.startsWith(`${prefix}/`),
    ),
    invalidDatabaseUrl,
    alternateDbFiles,
    warnings,
  };
}

export function logDatabaseStatus(cwd = process.cwd()): DatabaseStatus {
  const status = getDatabaseStatus(cwd);
  console.log(
    `[database] cwd=${status.cwd} path=${status.path} exists=${status.exists} size=${status.sizeBytes ?? 0}`,
  );
  if (status.isRailway) {
    console.log("[database] Railway environment detected");
  }
  if (status.configuredUrl) {
    console.log(`[database] DATABASE_URL=${status.configuredUrl}`);
  }
  if (status.configuredPath !== status.path) {
    console.log(`[database] configured path=${status.configuredPath}`);
  }
  for (const alt of status.alternateDbFiles) {
    if (alt.path === status.path) continue;
    if (alt.exists) {
      console.log(`[database] alternate ${alt.path} size=${alt.sizeBytes}`);
    }
  }
  for (const warning of status.warnings) {
    console.warn(`[database] WARNING: ${warning}`);
  }
  return status;
}
