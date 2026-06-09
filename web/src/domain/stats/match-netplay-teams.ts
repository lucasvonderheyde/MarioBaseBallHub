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

function winnerLabel(homeScore: number, awayScore: number, homeName: string, awayName: string): string {
  if (homeScore > awayScore) return `${homeName} (${homeScore}-${awayScore})`;
  if (awayScore > homeScore) return `${awayName} (${awayScore}-${homeScore})`;
  return `Tie (${homeScore}-${awayScore})`;
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

  const warnings: string[] = [];
  let alignment: NetplayAlignment = "unverified";
  let scheduleHomeScore = parsed.homeScore;
  let scheduleAwayScore = parsed.awayScore;
  let awaySideTeamId = scheduleAway.teamId;
  let homeSideTeamId = scheduleHome.teamId;
  let blockingError: string | null = null;

  if (directHome && directAway) {
    alignment = "direct";
  } else if (swappedHome && swappedAway) {
    alignment = "swapped";
    scheduleHomeScore = parsed.awayScore;
    scheduleAwayScore = parsed.homeScore;
    awaySideTeamId = scheduleHome.teamId;
    homeSideTeamId = scheduleAway.teamId;
    warnings.push(
      `Home and away were swapped on the schedule. Stats file has "${parsed.homePlayer}" at home and "${parsed.awayPlayer}" away — applied scores and rosters to the matching managers.`,
    );
  } else if (!hasHomeManager && !hasAwayManager) {
    alignment = "unverified";
    warnings.push(
      "Neither team has a manager assigned, so netplay names could not be verified. Scores were saved using the schedule home/away order.",
    );
  } else if (
    (hasHomeManager && homeLabels.length === 0) ||
    (hasAwayManager && awayLabels.length === 0)
  ) {
    alignment = "unverified";
    warnings.push(
      "Set your Rio/netplay username on your account page so uploads can verify the correct home and away teams.",
    );
  } else if (directHome || directAway || swappedHome || swappedAway) {
    alignment = "partial";
    blockingError =
      "Netplay names only partially match this game. Check the schedule home/away teams and make sure each manager's Rio/netplay username is set on their account page.";
    if (!directHome && !swappedHome && hasHomeManager) {
      warnings.push(
        `Scheduled home manager (${primaryNetplayLabel(scheduleHome.manager) ?? scheduleHome.teamName}) does not match file home "${parsed.homePlayer}" or away "${parsed.awayPlayer}".`,
      );
    }
    if (!directAway && !swappedAway && hasAwayManager) {
      warnings.push(
        `Scheduled away manager (${primaryNetplayLabel(scheduleAway.manager) ?? scheduleAway.teamName}) does not match file home "${parsed.homePlayer}" or away "${parsed.awayPlayer}".`,
      );
    }
  } else {
    alignment = "partial";
    blockingError =
      "Netplay names in the stats file do not match either manager for this game. Confirm you are uploading to the correct matchup and that managers have linked their Rio/netplay username.";
    warnings.push(
      `File players: away "${parsed.awayPlayer}", home "${parsed.homePlayer}". Scheduled: away ${primaryNetplayLabel(scheduleAway.manager) ?? "—"}, home ${primaryNetplayLabel(scheduleHome.manager) ?? "—"}.`,
    );
  }

  const fileWinnerLabel = winnerLabel(
    parsed.homeScore,
    parsed.awayScore,
    parsed.homePlayer,
    parsed.awayPlayer,
  );
  const scheduleWinnerLabel =
    alignment === "partial"
      ? null
      : winnerLabel(
          scheduleHomeScore,
          scheduleAwayScore,
          scheduleHome.teamName,
          scheduleAway.teamName,
        );

  if (alignment !== "partial" && scheduleWinnerLabel) {
    warnings.push(`Winner from stats file: ${fileWinnerLabel}. Saved as ${scheduleWinnerLabel}.`);
  }

  return {
    alignment,
    scheduleHomeScore,
    scheduleAwayScore,
    awaySideTeamId,
    homeSideTeamId,
    fileWinnerLabel,
    scheduleWinnerLabel,
    warnings,
    blockingError,
  };
}
