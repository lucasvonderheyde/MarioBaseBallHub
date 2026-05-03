import type { DecodedGameSummary } from "./decode-game-file";

function normalizeNetplayLabel(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Warns when decoded file netplay labels do not match managers' display names.
 * Does not block ingest; callers decide how to surface warnings.
 */
export function netplayLabelWarnings(
  parsed: Pick<DecodedGameSummary, "homePlayer" | "awayPlayer">,
  homeManagerDisplayName: string | null | undefined,
  awayManagerDisplayName: string | null | undefined,
): string[] {
  const warnings: string[] = [];
  if (
    homeManagerDisplayName &&
    normalizeNetplayLabel(homeManagerDisplayName) !==
      normalizeNetplayLabel(parsed.homePlayer)
  ) {
    warnings.push(
      `Home netplay name mismatch: schedule manager "${homeManagerDisplayName}" vs file "${parsed.homePlayer}".`,
    );
  }
  if (
    awayManagerDisplayName &&
    normalizeNetplayLabel(awayManagerDisplayName) !==
      normalizeNetplayLabel(parsed.awayPlayer)
  ) {
    warnings.push(
      `Away netplay name mismatch: schedule manager "${awayManagerDisplayName}" vs file "${parsed.awayPlayer}".`,
    );
  }
  return warnings;
}
