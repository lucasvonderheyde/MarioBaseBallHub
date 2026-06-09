import { formatCharIdDisplay } from "@/lib/character-display";
import type { BattingLine, PitchingLine } from "@/lib/game-stats-queries";
import type {
  ManagerCharacterBatting,
  ManagerCharacterPitching,
} from "@/lib/manager-stats";

export type ManagerBattingSort =
  | "ab"
  | "name"
  | "games"
  | "avg"
  | "obp"
  | "slg"
  | "hr"
  | "rbi";

export type ManagerPitchingSort =
  | "ip"
  | "name"
  | "games"
  | "bf"
  | "k"
  | "er"
  | "bb"
  | "h";

export const MANAGER_BATTING_SORT_OPTIONS: {
  value: ManagerBattingSort;
  label: string;
}[] = [
  { value: "ab", label: "Plate appearances" },
  { value: "name", label: "Name" },
  { value: "games", label: "Games" },
  { value: "avg", label: "AVG" },
  { value: "obp", label: "OBP" },
  { value: "slg", label: "SLG" },
  { value: "hr", label: "HR" },
  { value: "rbi", label: "RBI" },
];

export const MANAGER_PITCHING_SORT_OPTIONS: {
  value: ManagerPitchingSort;
  label: string;
}[] = [
  { value: "ip", label: "Innings pitched" },
  { value: "name", label: "Name" },
  { value: "games", label: "Games" },
  { value: "bf", label: "Batters faced" },
  { value: "k", label: "Strikeouts" },
  { value: "er", label: "Earned runs" },
  { value: "bb", label: "Walks" },
  { value: "h", label: "Hits allowed" },
];

export function parseManagerBattingSort(
  value: string | undefined,
): ManagerBattingSort {
  if (
    value === "name" ||
    value === "games" ||
    value === "avg" ||
    value === "obp" ||
    value === "slg" ||
    value === "hr" ||
    value === "rbi"
  ) {
    return value;
  }
  return "ab";
}

export function parseManagerPitchingSort(
  value: string | undefined,
): ManagerPitchingSort {
  if (
    value === "name" ||
    value === "games" ||
    value === "bf" ||
    value === "k" ||
    value === "er" ||
    value === "bb" ||
    value === "h"
  ) {
    return value;
  }
  return "ip";
}

function compareRates(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  const av = a ?? -1;
  const bv = b ?? -1;
  return bv - av;
}

function compareNames(a: string, b: string): number {
  return formatCharIdDisplay(a).localeCompare(formatCharIdDisplay(b));
}

export function sortManagerCharacterBatting(
  rows: ManagerCharacterBatting[],
  sort: ManagerBattingSort,
): ManagerCharacterBatting[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const lineA = a.line;
    const lineB = b.line;
    let cmp = 0;

    switch (sort) {
      case "name":
        cmp = compareNames(a.charId, b.charId);
        break;
      case "games":
        cmp = lineB.games - lineA.games;
        break;
      case "ab":
        cmp = lineB.ab - lineA.ab;
        break;
      case "avg":
        cmp = compareRates(lineA.ba, lineB.ba);
        break;
      case "obp":
        cmp = compareRates(lineA.obp, lineB.obp);
        break;
      case "slg":
        cmp = compareRates(lineA.slg, lineB.slg);
        break;
      case "hr":
        cmp = lineB.hr - lineA.hr;
        break;
      case "rbi":
        cmp = lineB.rbi - lineA.rbi;
        break;
    }

    if (cmp !== 0) return cmp;
    return compareNames(a.charId, b.charId);
  });
  return sorted;
}

export function sortManagerCharacterPitching(
  rows: ManagerCharacterPitching[],
  sort: ManagerPitchingSort,
): ManagerCharacterPitching[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const lineA = a.line;
    const lineB = b.line;
    let cmp = 0;

    switch (sort) {
      case "name":
        cmp = compareNames(a.charId, b.charId);
        break;
      case "games":
        cmp = lineB.games - lineA.games;
        break;
      case "ip":
        cmp = lineB.outsPitched - lineA.outsPitched;
        break;
      case "bf":
        cmp = lineB.battersFaced - lineA.battersFaced;
        break;
      case "k":
        cmp = lineB.strikeouts - lineA.strikeouts;
        break;
      case "er":
        cmp = lineB.earnedRuns - lineA.earnedRuns;
        break;
      case "bb":
        cmp = lineB.walks - lineA.walks;
        break;
      case "h":
        cmp = lineB.hitsAllowed - lineA.hitsAllowed;
        break;
    }

    if (cmp !== 0) return cmp;
    return compareNames(a.charId, b.charId);
  });
  return sorted;
}
