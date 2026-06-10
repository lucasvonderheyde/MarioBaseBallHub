import {
  CHARACTER_BAT_FILE_OVERRIDES,
  CHARACTER_ICON_FILES,
} from "@/data/character-icon-map";

export function iconFileForCharId(charId: string): string | null {
  return CHARACTER_ICON_FILES[charId] ?? null;
}

/** Bat art filename for a character (used on the attributes page). */
export function batFileForCharId(charId: string): string | null {
  const override = CHARACTER_BAT_FILE_OVERRIDES[charId];
  if (override) return override;
  return `${charId} bat.png`;
}
