import type { DecodedGameSummary } from "./decode-game-file";
import {
  managerNetplayLabels,
  netplayLabelMatches,
  primaryNetplayLabel,
} from "@/lib/netplay-label";

export type NetplayManagerContext = {
  teamId: string;
  teamName: string;
  manager: {
    username: string;
    displayName?: string | null;
    netplayUsername?: string | null;
  } | null;
};

export type NetplayAlignment = "direct" | "swapped" | "partial" | "unverified";

export type NetplayTeamMatch = {
  alignment: NetplayAlignment;
  /** Scores stored on schedule_games (relative to schedule home/away). */
  scheduleHomeScore: number;
  scheduleAwayScore: number;
  /** Schedule team that owns the file's Away-side roster and away score. */
  awaySideTeamId: string;
  /** Schedule team that owns the file's Home-side roster and home score. */
  homeSideTeamId: string;
  fileWinnerLabel: string;
  scheduleWinnerLabel: string | null;
  warnings: string[];
  blockingError: string | null;
};

function winnerLabel(
  homeScore: number,
  awayScore: number,
  homeName: string,
  awayName: string,
): string {
  if (homeScore > awayScore) return `${homeName} (${homeScore}-${awayScore})`;
  if (awayScore > homeScore) return `${awayName} (${awayScore}-${homeScore})`;
  return `Tie (${homeScore}-${awayScore})`;
}

function applyDirectMapping(
  parsed: Pick<DecodedGameSummary, "homeScore" | "awayScore">,
  scheduleHome: NetplayManagerContext,
  scheduleAway: NetplayManagerContext,
) {
  return {
    scheduleHomeScore: parsed.homeScore,
    scheduleAwayScore: parsed.awayScore,
    awaySideTeamId: scheduleAway.teamId,
    homeSideTeamId: scheduleHome.teamId,
  };
}

function applySwappedMapping(
  parsed: Pick<DecodedGameSummary, "homeScore" | "awayScore">,
  scheduleHome: NetplayManagerContext,
  scheduleAway: NetplayManagerContext,
) {
  return {
    scheduleHomeScore: parsed.awayScore,
    scheduleAwayScore: parsed.homeScore,
    awaySideTeamId: scheduleHome.teamId,
    homeSideTeamId: scheduleAway.teamId,
  };
}

export function matchNetplayTeams(
  parsed: Pick<
    DecodedGameSummary,
    "homePlayer" | "awayPlayer" | "homeScore" | "awayScore"
  >,
  scheduleHome: NetplayManagerContext,
  scheduleAway: NetplayManagerContext,
): NetplayTeamMatch {
  const homeLabels = managerNetplayLabels(scheduleHome.manager);
  const awayLabels = managerNetplayLabels(scheduleAway.manager);
  const hasHomeManager = scheduleHome.manager != null;
  const hasAwayManager = scheduleAway.manager != null;

  const directHome = netplayLabelMatches(homeLabels, parsed.homePlayer);
  const directAway = netplayLabelMatches(awayLabels, parsed.awayPlayer);
  const swappedHome = netplayLabelMatches(homeLabels, parsed.awayPlayer);
  const swappedAway = netplayLabelMatches(awayLabels, parsed.homePlayer);

  const directSignals = Number(directHome) + Number(directAway);
  const swapSignals = Number(swappedHome) + Number(swappedAway);
  const homeSideKnown = directHome || swappedHome;
  const awaySideKnown = directAway || swappedAway;
  const anyKnownSide = homeSideKnown || awaySideKnown;

  const warnings: string[] = [];
  let alignment: NetplayAlignment = "unverified";
  let blockingError: string | null = null;

  let mapping = applyDirectMapping(parsed, scheduleHome, scheduleAway);

  if (directHome && directAway) {
    alignment = "direct";
  } else if (swappedHome && swappedAway) {
    alignment = "swapped";
    mapping = applySwappedMapping(parsed, scheduleHome, scheduleAway);
    warnings.push(
      `Home and away were swapped on the schedule. Stats file has "${parsed.homePlayer}" at home and "${parsed.awayPlayer}" away — applied scores and rosters to the matching managers.`,
    );
  } else if (!hasHomeManager && !hasAwayManager) {
    alignment = "unverified";
    warnings.push(
      "Neither team has a manager assigned, so netplay names could not be verified. Scores were saved using the schedule home/away order.",
    );
  } else if (!anyKnownSide) {
    alignment = "partial";
    blockingError =
      "Netplay names in the stats file do not match either manager for this game. Confirm you are uploading to the correct matchup and that managers have linked their Rio/netplay username.";
    warnings.push(
      `File players: away "${parsed.awayPlayer}", home "${parsed.homePlayer}". Scheduled: away ${primaryNetplayLabel(scheduleAway.manager) ?? "—"}, home ${primaryNetplayLabel(scheduleHome.manager) ?? "—"}.`,
    );
  } else {
    alignment = "partial";
    const useSwap = swapSignals > directSignals;

    if (useSwap) {
      mapping = applySwappedMapping(parsed, scheduleHome, scheduleAway);
      warnings.push(
        `Only one manager matched and their side looked swapped on the schedule — scores and rosters were flipped to match the stats file.`,
      );
    } else {
      mapping = applyDirectMapping(parsed, scheduleHome, scheduleAway);
      warnings.push(
        "Only one manager could be verified from netplay names — saved using schedule home/away for the other team.",
      );
    }

    if (hasHomeManager && !homeSideKnown) {
      warnings.push(
        `Scheduled home manager (${primaryNetplayLabel(scheduleHome.manager) ?? scheduleHome.teamName}) did not match file home "${parsed.homePlayer}" or away "${parsed.awayPlayer}".`,
      );
    }
    if (hasAwayManager && !awaySideKnown) {
      warnings.push(
        `Scheduled away manager (${primaryNetplayLabel(scheduleAway.manager) ?? scheduleAway.teamName}) did not match file home "${parsed.homePlayer}" or away "${parsed.awayPlayer}".`,
      );
    }
    if (!hasHomeManager) {
      warnings.push("Scheduled home team has no manager yet — could not verify that side.");
    }
    if (!hasAwayManager) {
      warnings.push("Scheduled away team has no manager yet — could not verify that side.");
    }
  }

  const fileWinnerLabel = winnerLabel(
    parsed.homeScore,
    parsed.awayScore,
    parsed.homePlayer,
    parsed.awayPlayer,
  );
  const scheduleWinnerLabel =
    blockingError == null
      ? winnerLabel(
          mapping.scheduleHomeScore,
          mapping.scheduleAwayScore,
          scheduleHome.teamName,
          scheduleAway.teamName,
        )
      : null;

  if (blockingError == null && scheduleWinnerLabel) {
    warnings.push(`Winner from stats file: ${fileWinnerLabel}. Saved as ${scheduleWinnerLabel}.`);
  }

  return {
    alignment,
    scheduleHomeScore: mapping.scheduleHomeScore,
    scheduleAwayScore: mapping.scheduleAwayScore,
    awaySideTeamId: mapping.awaySideTeamId,
    homeSideTeamId: mapping.homeSideTeamId,
    fileWinnerLabel,
    scheduleWinnerLabel,
    warnings,
    blockingError,
  };
}
