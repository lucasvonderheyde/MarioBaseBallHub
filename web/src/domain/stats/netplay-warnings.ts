import type { DecodedGameSummary } from "./decode-game-file";
import { netplayLabelMatches, normalizeNetplayLabel } from "@/lib/netplay-label";

/**
 * @deprecated Prefer matchNetplayTeams for upload validation.
 */
export function netplayLabelWarnings(
  parsed: Pick<DecodedGameSummary, "homePlayer" | "awayPlayer">,
  homeManagerDisplayName: string | null | undefined,
  awayManagerDisplayName: string | null | undefined,
): string[] {
  const warnings: string[] = [];
  const homeLabels = homeManagerDisplayName
    ? [normalizeNetplayLabel(homeManagerDisplayName)]
    : [];
  const awayLabels = awayManagerDisplayName
    ? [normalizeNetplayLabel(awayManagerDisplayName)]
    : [];
  if (
    homeManagerDisplayName &&
    !netplayLabelMatches(homeLabels, parsed.homePlayer)
  ) {
    warnings.push(
      `Home netplay name mismatch: schedule manager "${homeManagerDisplayName}" vs file "${parsed.homePlayer}".`,
    );
  }
  if (
    awayManagerDisplayName &&
    !netplayLabelMatches(awayLabels, parsed.awayPlayer)
  ) {
    warnings.push(
      `Away netplay name mismatch: schedule manager "${awayManagerDisplayName}" vs file "${parsed.awayPlayer}".`,
    );
  }
  return warnings;
}
