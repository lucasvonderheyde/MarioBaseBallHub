import {
  generateInkySeasonRecap,
  inkyEnabled,
  type GeneratedInkyArticle,
} from "@/lib/inky-generate";

export type GeneratedRecap = GeneratedInkyArticle;

export function aiNewsEnabled(): boolean {
  return inkyEnabled();
}

/** @deprecated Use generateInkySeasonRecap from @/lib/inky-generate */
export async function generateSeasonRecap(
  seasonId: string,
): Promise<GeneratedRecap | { error: string }> {
  return generateInkySeasonRecap(seasonId);
}
