export const INKY_POST_TYPES = [
  "game_recap",
  "weekly",
  "series_recap",
  "preview",
  "draft_recap",
  "season_recap",
] as const;

export type InkyPostType = (typeof INKY_POST_TYPES)[number];

export function isInkyPostType(value: string): value is InkyPostType {
  return (INKY_POST_TYPES as readonly string[]).includes(value);
}

export function inkyPostTypeLabel(type: InkyPostType): string {
  switch (type) {
    case "game_recap":
      return "Game recap";
    case "weekly":
      return "Weekly column";
    case "series_recap":
      return "Series recap";
    case "preview":
      return "Matchup preview";
    case "draft_recap":
      return "Draft recap";
    case "season_recap":
      return "Season roundup";
  }
}
