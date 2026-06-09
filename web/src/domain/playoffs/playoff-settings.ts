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
});

export type PlayoffSettings = z.infer<typeof playoffSettingsSchema>;

export const DEFAULT_PLAYOFF_SETTINGS: PlayoffSettings = {
  autoQualifyCount: 8,
  playInTeamCount: 4,
  playInSpots: 2,
  playInRoundNumber: 1,
};

export function parsePlayoffSettings(raw: string | null | undefined): PlayoffSettings {
  if (!raw) return { ...DEFAULT_PLAYOFF_SETTINGS };
  try {
    const parsed = playoffSettingsSchema.safeParse(JSON.parse(raw));
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
