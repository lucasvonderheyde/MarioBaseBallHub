import "server-only";

import crypto from "crypto";

export function newUuid(): string {
  return crypto.randomUUID();
}

export function slugifyLeagueSegment(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
