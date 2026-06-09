import { z } from "zod";

const seasonScheduleSettingsSchema = z.object({
  /** manual = admin adds games; round_robin = everyone plays once (league "swiss"). */
  regularSeasonFormat: z.enum(["manual", "round_robin"]),
});

export type SeasonScheduleSettings = z.infer<typeof seasonScheduleSettingsSchema>;

export const DEFAULT_SEASON_SCHEDULE_SETTINGS: SeasonScheduleSettings = {
  regularSeasonFormat: "manual",
};

export function parseSeasonScheduleSettings(
  raw: string | null | undefined,
): SeasonScheduleSettings {
  if (!raw) return { ...DEFAULT_SEASON_SCHEDULE_SETTINGS };
  try {
    const parsed = seasonScheduleSettingsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_SEASON_SCHEDULE_SETTINGS };
}

export function serializeSeasonScheduleSettings(settings: SeasonScheduleSettings): string {
  return JSON.stringify(settings);
}
