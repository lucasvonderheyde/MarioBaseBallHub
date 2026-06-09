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
export function formatCharIdDisplay(
  charId: string,
  isCaptain = false,
  copyNumber?: number,
): string {
  const catalog = catalogByGameCharId.get(charId);
  let name: string;
  if (catalog) {
    name = isCaptain ? `Captain ${catalog.displayName}` : catalog.displayName;
  } else {
    const paren = /\(([^)]+)\)$/.exec(charId);
    if (paren) {
      const base = charId.slice(0, paren.index).trim();
      const code = paren[1];
      const color = COLOR_CODES[code] ?? code;
      name = isCaptain ? `Captain ${base} (${color})` : `${base} (${color})`;
    } else {
      name = isCaptain ? `Captain ${charId}` : charId;
    }
  }
  if (copyNumber != null) {
    return `${name} (#${copyNumber})`;
  }
  return name;
}

export function mugshotFileForCharId(charId: string): string | null {
  return catalogByGameCharId.get(charId)?.mugshotFile ?? null;
}

export function catalogDisplayName(charId: string): string | null {
  return catalogByGameCharId.get(charId)?.displayName ?? null;
}
