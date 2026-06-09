import fs from "fs";
import path from "path";
import { logDatabaseStatus } from "./database-status";
import { resolveDbPath } from "./resolve-db-path";

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
logDatabaseStatus();
