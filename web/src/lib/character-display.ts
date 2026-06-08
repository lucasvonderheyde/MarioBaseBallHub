import { CHARACTER_CATALOG } from "@/data/character-catalog";

const COLOR_CODES: Record<string, string> = {
  R: "Red",
  B: "Blue",
  Y: "Yellow",
  G: "Green",
  W: "White",
  Bk: "Black",
  P: "Purple",
  Gy: "Grey",
};

const catalogByGameCharId = new Map(
  CHARACTER_CATALOG.map((c) => [c.gameCharId, c] as const),
);

/** URL-safe slug for gameCharId (encodeURIComponent). */
export function charIdToSlug(charId: string): string {
  return encodeURIComponent(charId);
}

export function slugToCharId(slug: string): string {
  return decodeURIComponent(slug);
}

/** Display name for a raw CharID from game JSON, with optional captain prefix. */
export function formatCharIdDisplay(charId: string, isCaptain = false): string {
  const catalog = catalogByGameCharId.get(charId);
  if (catalog) {
    return isCaptain ? `Captain ${catalog.displayName}` : catalog.displayName;
  }
  const paren = /\(([^)]+)\)$/.exec(charId);
  if (paren) {
    const base = charId.slice(0, paren.index).trim();
    const code = paren[1];
    const color = COLOR_CODES[code] ?? code;
    const name = `${base} (${color})`;
    return isCaptain ? `Captain ${name}` : name;
  }
  return isCaptain ? `Captain ${charId}` : charId;
}

export function mugshotFileForCharId(charId: string): string | null {
  return catalogByGameCharId.get(charId)?.mugshotFile ?? null;
}

export function catalogDisplayName(charId: string): string | null {
  return catalogByGameCharId.get(charId)?.displayName ?? null;
}
