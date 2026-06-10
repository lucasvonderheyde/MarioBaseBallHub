import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyPendingDatabaseRestore,
  backupDirectoryFor,
  createSqliteBackup,
  listSqliteBackups,
  pruneOldBackups,
  resolveBackupFile,
  scheduleDatabaseRestore,
} from "./sqlite-backup";

describe("sqlite-backup", () => {
  let tempDir = "";

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  function seedDb(dbPath: string): void {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.exec("CREATE TABLE leagues (id text PRIMARY KEY, name text NOT NULL);");
    sqlite.prepare("INSERT INTO leagues (id, name) VALUES (?, ?)").run("1", "Test");
    sqlite.close();
  }

  it("creates and lists backups", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "msb-backup-"));
    const dbPath = path.join(tempDir, "data", "league.db");
    seedDb(dbPath);

    const backupPath = await createSqliteBackup(dbPath, "pre-delete");
    expect(backupPath).toBeTruthy();

    const backups = listSqliteBackups(dbPath);
    expect(backups).toHaveLength(1);
    expect(backups[0]!.sizeBytes).toBeGreaterThan(100);
  });

  it("prunes old backups", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "msb-backup-"));
    const dbPath = path.join(tempDir, "data", "league.db");
    seedDb(dbPath);
    const backupDir = backupDirectoryFor(dbPath);

    for (let i = 0; i < 3; i++) {
      await createSqliteBackup(dbPath, `snap-${i}`, { retainCount: 99 });
    }
    expect(fs.readdirSync(backupDir).filter((f) => f.endsWith(".db"))).toHaveLength(3);

    pruneOldBackups(backupDir, 2);
    expect(fs.readdirSync(backupDir).filter((f) => f.endsWith(".db"))).toHaveLength(2);
  });

  it("schedules and applies pending restore", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "msb-backup-"));
    const dbPath = path.join(tempDir, "data", "league.db");
    seedDb(dbPath);
    const backupPath = await createSqliteBackup(dbPath, "snapshot");
    expect(backupPath).toBeTruthy();

    const sqlite = new Database(dbPath);
    sqlite.prepare("DELETE FROM leagues").run();
    sqlite.close();

    const filename = path.basename(backupPath!);
    scheduleDatabaseRestore(dbPath, filename);
    expect(applyPendingDatabaseRestore(dbPath)).toBe(true);

    const restored = new Database(dbPath, { readonly: true });
    const row = restored.prepare("SELECT name FROM leagues WHERE id = ?").get("1") as {
      name: string;
    };
    restored.close();
    expect(row.name).toBe("Test");
  });

  it("rejects invalid backup filenames", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "msb-backup-"));
    const dbPath = path.join(tempDir, "data", "league.db");
    expect(resolveBackupFile(dbPath, "../escape.db")).toBeNull();
    expect(resolveBackupFile(dbPath, "not-a-backup.db")).toBeNull();
  });
});
