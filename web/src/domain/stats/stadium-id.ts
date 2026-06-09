import { STADIUM_CATALOG } from "@/data/character-catalog";

/** JSON `StadiumID` strings that differ from the catalog's canonical `gameStadiumId`. */
const STADIUM_ALIASES: Record<string, string> = {
  "DK Jungle": "Donkey Kong Jungle",
};

const canonicalIds = new Set(STADIUM_CATALOG.map((stadium) => stadium.gameStadiumId));

const aliasToCanonical = new Map<string, string>(
  Object.entries(STADIUM_ALIASES).map(([alias, canonical]) => [
    alias.toLowerCase(),
    canonical,
  ]),
);

/** Maps uploaded JSON StadiumID to the canonical catalog id used in the app. */
export function normalizeStadiumId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (canonicalIds.has(trimmed)) return trimmed;

  const aliasMatch = aliasToCanonical.get(trimmed.toLowerCase());
  if (aliasMatch) return aliasMatch;

  const caseMatch = STADIUM_CATALOG.find(
    (stadium) => stadium.gameStadiumId.toLowerCase() === trimmed.toLowerCase(),
  );
  if (caseMatch) return caseMatch.gameStadiumId;

  return trimmed;
}

/** All stored JSON values that should count toward a catalog stadium (canonical + aliases). */
export function stadiumIdVariants(canonicalId: string): string[] {
  const variants = new Set<string>([canonicalId]);
  for (const [alias, canonical] of Object.entries(STADIUM_ALIASES)) {
    if (canonical === canonicalId) variants.add(alias);
  }
  return [...variants];
}

export function stadiumIdsMatch(
  storedId: string | null | undefined,
  canonicalId: string,
): boolean {
  const normalized = normalizeStadiumId(storedId);
  return normalized === canonicalId;
}
