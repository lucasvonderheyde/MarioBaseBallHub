import fs from "fs";
import path from "path";
import { logDatabaseStatus } from "./database-status";
import { resolveDbPath } from "./resolve-db-path";
import {
  applyPendingDatabaseRestore,
  backupDatabaseOnStartup,
} from "./sqlite-backup";

async function main(): Promise<void> {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  if (applyPendingDatabaseRestore(dbPath)) {
    console.log(`[database] Restored database from pending backup into ${dbPath}`);
  }

  await backupDatabaseOnStartup(dbPath);

  const status = logDatabaseStatus();

  if (process.env.NODE_ENV === "production" && status.invalidDatabaseUrl) {
    console.error(
      "[database] FATAL: DATABASE_URL must be a SQLite file path. Fix Railway variables and redeploy.",
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[database] FATAL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
