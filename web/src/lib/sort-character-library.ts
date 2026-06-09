import type { BattingLine } from "@/lib/game-stats-queries";
import type { LeagueCharacterEntry } from "@/lib/league-characters";

export type CharacterLibrarySort = "name" | "games" | "avg" | "obp" | "hr" | "rbi";

export const CHARACTER_LIBRARY_SORT_OPTIONS: {
  value: CharacterLibrarySort;
  label: string;
}[] = [
  { value: "name", label: "Name" },
  { value: "games", label: "Games" },
  { value: "avg", label: "AVG" },
  { value: "obp", label: "OBP" },
  { value: "hr", label: "HR" },
  { value: "rbi", label: "RBI" },
];

export function parseCharacterLibrarySort(
  value: string | undefined,
): CharacterLibrarySort {
  if (
    value === "games" ||
    value === "avg" ||
    value === "obp" ||
    value === "hr" ||
    value === "rbi"
  ) {
    return value;
  }
  return "name";
}

function compareRates(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  const av = a ?? -1;
  const bv = b ?? -1;
  return bv - av;
}

export function sortCharacterLibrary(
  characters: LeagueCharacterEntry[],
  batting: Map<string, BattingLine>,
  sort: CharacterLibrarySort,
): LeagueCharacterEntry[] {
  const sorted = [...characters];
  sorted.sort((a, b) => {
    const lineA = batting.get(a.gameCharId);
    const lineB = batting.get(b.gameCharId);
    let cmp = 0;

    switch (sort) {
      case "name":
        cmp = a.displayName.localeCompare(b.displayName);
        break;
      case "games":
        cmp = (lineB?.games ?? 0) - (lineA?.games ?? 0);
        break;
      case "avg":
        cmp = compareRates(lineA?.ba, lineB?.ba);
        break;
      case "obp":
        cmp = compareRates(lineA?.obp, lineB?.obp);
        break;
      case "hr":
        cmp = (lineB?.hr ?? 0) - (lineA?.hr ?? 0);
        break;
      case "rbi":
        cmp = (lineB?.rbi ?? 0) - (lineA?.rbi ?? 0);
        break;
    }

    if (cmp !== 0) return cmp;
    return a.displayName.localeCompare(b.displayName);
  });
  return sorted;
}
