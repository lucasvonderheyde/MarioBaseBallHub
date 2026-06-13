import {
  fieldingRatePerGame,
} from "@/domain/stats/fielding-metrics";
import type { FieldingLine } from "@/lib/game-stats-queries";
import type { LeagueCharacterEntry } from "@/lib/league-characters";

export type CharacterLibraryFieldingSort =
  | "name"
  | "games"
  | "outs"
  | "opg"
  | "bf"
  | "bigPlays";

export const CHARACTER_LIBRARY_FIELDING_SORT_OPTIONS: {
  value: CharacterLibraryFieldingSort;
  label: string;
}[] = [
  { value: "name", label: "Name" },
  { value: "games", label: "Games" },
  { value: "outs", label: "Outs" },
  { value: "opg", label: "Outs/G" },
  { value: "bf", label: "BF in field" },
  { value: "bigPlays", label: "Big plays" },
];

export function parseCharacterLibraryFieldingSort(
  value: string | undefined,
): CharacterLibraryFieldingSort {
  if (
    value === "games" ||
    value === "outs" ||
    value === "opg" ||
    value === "bf" ||
    value === "bigPlays"
  ) {
    return value;
  }
  return "name";
}

export function hasFieldingStats(line: FieldingLine | undefined): boolean {
  if (!line) return false;
  return line.games > 0 || line.outs > 0 || line.battersInField > 0;
}

export function sortCharacterLibraryFielding(
  characters: LeagueCharacterEntry[],
  fielding: Map<string, FieldingLine>,
  sort: CharacterLibraryFieldingSort,
): LeagueCharacterEntry[] {
  const sorted = [...characters];
  sorted.sort((a, b) => {
    const lineA = fielding.get(a.gameCharId);
    const lineB = fielding.get(b.gameCharId);
    let cmp = 0;

    switch (sort) {
      case "name":
        cmp = a.displayName.localeCompare(b.displayName);
        break;
      case "games":
        cmp = (lineB?.games ?? 0) - (lineA?.games ?? 0);
        break;
      case "outs":
        cmp = (lineB?.outs ?? 0) - (lineA?.outs ?? 0);
        break;
      case "opg":
        cmp =
          (fieldingRatePerGame(lineB?.outs ?? 0, lineB?.games ?? 0) ?? 0) -
          (fieldingRatePerGame(lineA?.outs ?? 0, lineA?.games ?? 0) ?? 0);
        break;
      case "bf":
        cmp = (lineB?.battersInField ?? 0) - (lineA?.battersInField ?? 0);
        break;
      case "bigPlays":
        cmp = (lineB?.bigPlays ?? 0) - (lineA?.bigPlays ?? 0);
        break;
    }

    if (cmp !== 0) return cmp;
    return a.displayName.localeCompare(b.displayName);
  });
  return sorted;
}
