import path from "node:path";

/**
 * Next runs with `process.cwd()` = `web/`. Repo root is the parent directory
 * (sibling of `web/`), where `data/game-statistics/` lives.
 */
export function repositoryRootFromWeb(): string {
  return path.resolve(process.cwd(), "..");
}

export function gameStatisticsSamplesDirectory(): string {
  return path.join(repositoryRootFromWeb(), "data", "game-statistics");
}
