import fs from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isRemoteDatabaseUrl,
  resolveConfiguredDbPath,
  resolveDbPath,
} from "./resolve-db-path";

describe("resolveConfiguredDbPath", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalRailway = process.env.RAILWAY_ENVIRONMENT;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalRailway === undefined) delete process.env.RAILWAY_ENVIRONMENT;
    else process.env.RAILWAY_ENVIRONMENT = originalRailway;
  });

  it("defaults to data/league.db under cwd", () => {
    delete process.env.DATABASE_URL;
    expect(resolveConfiguredDbPath("/tmp/web")).toBe(
      path.join("/tmp/web", "data", "league.db"),
    );
  });

  it("resolves absolute file: URLs", () => {
    process.env.DATABASE_URL = "file:/app/data/league.db";
    expect(resolveConfiguredDbPath("/tmp/web")).toBe("/app/data/league.db");
  });

  it("rejects postgres-style DATABASE_URL", () => {
    process.env.DATABASE_URL =
      "postgresql://postgres:secret@containers-us-west-123.railway.app:5432/railway";
    expect(() => resolveConfiguredDbPath()).toThrow(/SQLite file path/);
  });
});

describe("isRemoteDatabaseUrl", () => {
  it("detects remote schemes", () => {
    expect(isRemoteDatabaseUrl("postgresql://user@host/db")).toBe(true);
    expect(isRemoteDatabaseUrl("mysql://user@host/db")).toBe(true);
  });

  it("allows sqlite file URLs", () => {
    expect(isRemoteDatabaseUrl("file:/app/data/league.db")).toBe(false);
    expect(isRemoteDatabaseUrl("file:./data/league.db")).toBe(false);
  });
});

describe("resolveDbPath railway fallback", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalRailway = process.env.RAILWAY_ENVIRONMENT;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalRailway === undefined) delete process.env.RAILWAY_ENVIRONMENT;
    else process.env.RAILWAY_ENVIRONMENT = originalRailway;
  });

  it("uses legacy volume path when configured path is empty", () => {
    process.env.RAILWAY_ENVIRONMENT = "production";
    process.env.DATABASE_URL = "file:/app/data/league.db";

    vi.spyOn(fs, "statSync").mockImplementation((filePath) => {
      if (String(filePath) === "/app/web/data/league.db") {
        return { isFile: () => true, size: 8192 } as fs.Stats;
      }
      throw new Error("ENOENT");
    });

    expect(resolveDbPath("/app")).toBe("/app/web/data/league.db");
  });
});
