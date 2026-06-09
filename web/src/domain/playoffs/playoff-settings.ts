import { z } from "zod";

const playoffSettingsSchema = z.object({
  /** Top N teams auto-qualify for the main bracket (by seed). */
  autoQualifyCount: z.number().int().min(0).max(32),
  /** Teams immediately below auto-qualify that enter the play-in. */
  playInTeamCount: z.number().int().min(0).max(16),
  /** Play-in spots awarded to winners (join main bracket). */
  playInSpots: z.number().int().min(0).max(8),
  /** Playoff schedule round number used for play-in games. */
  playInRoundNumber: z.number().int().min(1).max(99),
  /** Teams in the main elimination bracket (usually 8). */
  mainBracketTeamCount: z.number().int().min(2).max(32),
  /** Best-of for play-in games (typically 1). */
  playInBestOf: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
  /** Best-of for main-bracket rounds before the finals (typically 1). */
  mainRoundBestOf: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
  /** Best-of for the championship round (typically 3 or 5). */
  finalsBestOf: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
  /** Higher seed gets home field in each series. */
  higherSeedHomeField: z.boolean(),
});

export type PlayoffSettings = z.infer<typeof playoffSettingsSchema>;

export type BestOf = PlayoffSettings["playInBestOf"];

export const DEFAULT_PLAYOFF_SETTINGS: PlayoffSettings = {
  autoQualifyCount: 8,
  playInTeamCount: 4,
  playInSpots: 2,
  playInRoundNumber: 1,
  mainBracketTeamCount: 8,
  playInBestOf: 1,
  mainRoundBestOf: 1,
  finalsBestOf: 3,
  higherSeedHomeField: true,
};

export function parsePlayoffSettings(raw: string | null | undefined): PlayoffSettings {
  if (!raw) return { ...DEFAULT_PLAYOFF_SETTINGS };
  try {
    const parsed = playoffSettingsSchema.safeParse({
      ...DEFAULT_PLAYOFF_SETTINGS,
      ...JSON.parse(raw),
    });
    if (parsed.success) return parsed.data;
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_PLAYOFF_SETTINGS };
}

export function serializePlayoffSettings(settings: PlayoffSettings): string {
  return JSON.stringify(settings);
}

export function playInEnabled(settings: PlayoffSettings): boolean {
  return settings.playInTeamCount > 0 && settings.playInSpots > 0;
}

/** Teams that enter the main bracket without winning a play-in game. */
export function getDirectQualifyCount(settings: PlayoffSettings): number {
  if (!playInEnabled(settings)) {
    return Math.min(settings.autoQualifyCount, settings.mainBracketTeamCount);
  }
  return Math.min(
    settings.autoQualifyCount,
    settings.mainBracketTeamCount - settings.playInSpots,
  );
}

/** Wins needed to take a best-of series. */
export function winsNeeded(bestOf: BestOf): number {
  return Math.floor(bestOf / 2) + 1;
}

/** Standard quarterfinal pairings for an 8-team bracket (0-indexed match slots). */
export const EIGHT_TEAM_QF_SEEDS: [number, number][] = [
  [1, 8],
  [4, 5],
  [3, 6],
  [2, 7],
];
