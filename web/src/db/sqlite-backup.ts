import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { resolveDbPath } from "./resolve-db-path";

const MIN_BACKUP_BYTES = 4096;
const DEFAULT_RETAIN_COUNT = 20;

export type SqliteBackupInfo = {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: Date;
  reason: string | null;
};

type PendingRestore = {
  backupPath: string;
  scheduledAt: string;
};

export function backupDirectoryFor(dbPath: string): string {
  return path.join(path.dirname(dbPath), "backups");
}

function pendingRestorePath(dbPath: string): string {
  return path.join(backupDirectoryFor(dbPath), ".pending-restore.json");
}

function backupFilename(timestamp: string, reason: string): string {
  const safeReason = reason
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `league-${timestamp}-${safeReason || "snapshot"}.db`;
}

function parseReasonFromFilename(filename: string): string | null {
  const prefix = "league-";
  if (!filename.startsWith(prefix) || !filename.endsWith(".db")) return null;
  const stem = filename.slice(prefix.length, -3);
  const zIndex = stem.indexOf("Z-");
  if (zIndex === -1) return null;
  return stem.slice(zIndex + 2).replace(/-/g, " ");
}

async function runBackup(
  source: Database.Database,
  backupPath: string,
): Promise<void> {
  await source.backup(backupPath);
}

export function pruneOldBackups(
  backupDir: string,
  retainCount = DEFAULT_RETAIN_COUNT,
): void {
  const files = fs
    .readdirSync(backupDir)
    .filter((name) => name.startsWith("league-") && name.endsWith(".db"))
    .map((name) => ({
      name,
      mtime: fs.statSync(path.join(backupDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const stale of files.slice(retainCount)) {
    fs.unlinkSync(path.join(backupDir, stale.name));
  }
}

/** Creates a consistent SQLite backup using the native backup API (safe while DB is open). */
export async function createSqliteBackup(
  dbPath: string,
  reason: string,
  options?: { sqlite?: Database.Database; retainCount?: number },
): Promise<string | null> {
  if (!fs.existsSync(dbPath)) return null;

  const size = fs.statSync(dbPath).size;
  if (size < MIN_BACKUP_BYTES) return null;

  const backupDir = backupDirectoryFor(dbPath);
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, backupFilename(timestamp, reason));

  const ownsConnection = !options?.sqlite;
  const source = options?.sqlite ?? new Database(dbPath, { readonly: true });

  try {
    await runBackup(source, backupPath);
  } finally {
    if (ownsConnection) source.close();
  }

  pruneOldBackups(backupDir, options?.retainCount ?? DEFAULT_RETAIN_COUNT);
  return backupPath;
}

export function listSqliteBackups(dbPath = resolveDbPath()): SqliteBackupInfo[] {
  const backupDir = backupDirectoryFor(dbPath);
  if (!fs.existsSync(backupDir)) return [];

  return fs
    .readdirSync(backupDir)
    .filter((name) => name.startsWith("league-") && name.endsWith(".db"))
    .map((filename) => {
      const fullPath = path.join(backupDir, filename);
      const stat = fs.statSync(fullPath);
      return {
        filename,
        path: fullPath,
        sizeBytes: stat.size,
        createdAt: stat.mtime,
        reason: parseReasonFromFilename(filename),
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function resolveBackupFile(
  dbPath: string,
  filename: string,
): string | null {
  if (!/^league-[^/\\]+\.db$/.test(filename)) {
    return null;
  }
  const backupDir = backupDirectoryFor(dbPath);
  const fullPath = path.join(backupDir, filename);
  if (!fullPath.startsWith(`${backupDir}${path.sep}`)) return null;
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}

export function scheduleDatabaseRestore(
  dbPath: string,
  filename: string,
): void {
  const backupPath = resolveBackupFile(dbPath, filename);
  if (!backupPath) {
    throw new Error("Backup file not found.");
  }

  const pending: PendingRestore = {
    backupPath,
    scheduledAt: new Date().toISOString(),
  };
  fs.mkdirSync(backupDirectoryFor(dbPath), { recursive: true });
  fs.writeFileSync(pendingRestorePath(dbPath), JSON.stringify(pending));
}

/** Runs on container startup before migrations. Returns true when a restore was applied. */
export function applyPendingDatabaseRestore(dbPath = resolveDbPath()): boolean {
  const pendingPath = pendingRestorePath(dbPath);
  if (!fs.existsSync(pendingPath)) return false;

  let pending: PendingRestore;
  try {
    pending = JSON.parse(fs.readFileSync(pendingPath, "utf8")) as PendingRestore;
  } catch {
    fs.unlinkSync(pendingPath);
    return false;
  }

  if (!pending.backupPath || !fs.existsSync(pending.backupPath)) {
    fs.unlinkSync(pendingPath);
    return false;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.copyFileSync(pending.backupPath, dbPath);
  for (const suffix of ["-wal", "-shm"]) {
    try {
      fs.unlinkSync(`${dbPath}${suffix}`);
    } catch {
      // no wal/shm
    }
  }
  fs.unlinkSync(pendingPath);
  return true;
}

export async function backupDatabaseOnStartup(
  dbPath = resolveDbPath(),
): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") return null;
  const backupPath = await createSqliteBackup(dbPath, "pre-migrate");
  if (backupPath) {
    console.log(`[database] Startup backup created: ${backupPath}`);
  }
  return backupPath;
}
