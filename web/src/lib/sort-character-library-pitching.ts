import { earnedRunAverage } from "@/domain/stats/batting-metrics";
import type { PitchingLine } from "@/lib/game-stats-queries";
import type { LeagueCharacterEntry } from "@/lib/league-characters";

export type CharacterLibraryPitchingSort =
  | "name"
  | "games"
  | "ip"
  | "era"
  | "bf"
  | "k"
  | "bb"
  | "er";

export const CHARACTER_LIBRARY_PITCHING_SORT_OPTIONS: {
  value: CharacterLibraryPitchingSort;
  label: string;
}[] = [
  { value: "name", label: "Name" },
  { value: "games", label: "Games" },
  { value: "ip", label: "IP" },
  { value: "era", label: "ERA" },
  { value: "bf", label: "BF" },
  { value: "k", label: "K" },
  { value: "bb", label: "BB" },
  { value: "er", label: "ER" },
];

export function parseCharacterLibraryPitchingSort(
  value: string | undefined,
): CharacterLibraryPitchingSort {
  if (
    value === "games" ||
    value === "ip" ||
    value === "era" ||
    value === "bf" ||
    value === "k" ||
    value === "bb" ||
    value === "er"
  ) {
    return value;
  }
  return "name";
}

function compareEra(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  const av = a ?? Number.POSITIVE_INFINITY;
  const bv = b ?? Number.POSITIVE_INFINITY;
  return av - bv;
}

export function hasPitchingStats(line: PitchingLine | undefined): boolean {
  if (!line) return false;
  return line.games > 0 || line.outsPitched > 0 || line.battersFaced > 0;
}

export function sortCharacterLibraryPitching(
  characters: LeagueCharacterEntry[],
  pitching: Map<string, PitchingLine>,
  sort: CharacterLibraryPitchingSort,
): LeagueCharacterEntry[] {
  const sorted = [...characters];
  sorted.sort((a, b) => {
    const lineA = pitching.get(a.gameCharId);
    const lineB = pitching.get(b.gameCharId);
    let cmp = 0;

    switch (sort) {
      case "name":
        cmp = a.displayName.localeCompare(b.displayName);
        break;
      case "games":
        cmp = (lineB?.games ?? 0) - (lineA?.games ?? 0);
        break;
      case "ip":
        cmp = (lineB?.outsPitched ?? 0) - (lineA?.outsPitched ?? 0);
        break;
      case "era":
        cmp = compareEra(
          earnedRunAverage(lineA?.earnedRuns ?? 0, lineA?.outsPitched ?? 0),
          earnedRunAverage(lineB?.earnedRuns ?? 0, lineB?.outsPitched ?? 0),
        );
        break;
      case "bf":
        cmp = (lineB?.battersFaced ?? 0) - (lineA?.battersFaced ?? 0);
        break;
      case "k":
        cmp = (lineB?.strikeouts ?? 0) - (lineA?.strikeouts ?? 0);
        break;
      case "bb":
        cmp = (lineB?.walks ?? 0) - (lineA?.walks ?? 0);
        break;
      case "er":
        cmp = (lineB?.earnedRuns ?? 0) - (lineA?.earnedRuns ?? 0);
        break;
    }

    if (cmp !== 0) return cmp;
    return a.displayName.localeCompare(b.displayName);
  });
  return sorted;
}
