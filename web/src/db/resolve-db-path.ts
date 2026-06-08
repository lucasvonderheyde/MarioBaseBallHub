import path from "path";

/** Resolves SQLite file path from DATABASE_URL (file:…) or default `data/league.db` (cwd = web/). */
export function resolveDbPath(cwd = process.cwd()): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (raw) {
    const withoutScheme = raw.replace(/^file:/i, "");
    return path.isAbsolute(withoutScheme)
      ? withoutScheme
      : path.join(cwd, withoutScheme.replace(/^\.\//, ""));
  }
  return path.join(cwd, "data", "league.db");
}
