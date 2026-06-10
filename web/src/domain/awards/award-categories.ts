export const AWARD_CATEGORIES = [
  { id: "mvp", label: "MVP", description: "Most valuable manager this season" },
  {
    id: "best_pitcher",
    label: "Best pitcher",
    description: "Team with the strongest pitching staff",
  },
  {
    id: "best_batting",
    label: "Best batting",
    description: "Team with the best offensive production",
  },
  {
    id: "best_fielding",
    label: "Best fielding",
    description: "Team with the best defensive play",
  },
] as const;

export type AwardCategoryId = (typeof AWARD_CATEGORIES)[number]["id"];

export function isAwardCategory(value: string): value is AwardCategoryId {
  return AWARD_CATEGORIES.some((category) => category.id === value);
}
