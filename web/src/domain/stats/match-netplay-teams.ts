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

function resolveTeamForFilePlayer(
  filePlayer: string,
  scheduleHome: NetplayManagerContext,
  scheduleAway: NetplayManagerContext,
): string | null {
  if (netplayLabelMatches(managerNetplayLabels(scheduleHome.manager), filePlayer)) {
    return scheduleHome.teamId;
  }
  if (netplayLabelMatches(managerNetplayLabels(scheduleAway.manager), filePlayer)) {
    return scheduleAway.teamId;
  }
  return null;
}

function otherTeamId(
  teamId: string,
  scheduleHome: NetplayManagerContext,
  scheduleAway: NetplayManagerContext,
): string {
  return teamId === scheduleHome.teamId ? scheduleAway.teamId : scheduleHome.teamId;
}

function buildMapping(
  parsed: Pick<DecodedGameSummary, "homeScore" | "awayScore">,
  scheduleHome: NetplayManagerContext,
  scheduleAway: NetplayManagerContext,
  homeSideTeamId: string,
  awaySideTeamId: string,
) {
  return {
    scheduleHomeScore:
      homeSideTeamId === scheduleHome.teamId ? parsed.homeScore : parsed.awayScore,
    scheduleAwayScore:
      awaySideTeamId === scheduleAway.teamId ? parsed.awayScore : parsed.homeScore,
    awaySideTeamId,
    homeSideTeamId,
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
  const hasHomeManager = scheduleHome.manager != null;
  const hasAwayManager = scheduleAway.manager != null;

  const homePlayerTeamId = resolveTeamForFilePlayer(
    parsed.homePlayer,
    scheduleHome,
    scheduleAway,
  );
  const awayPlayerTeamId = resolveTeamForFilePlayer(
    parsed.awayPlayer,
    scheduleHome,
    scheduleAway,
  );

  const warnings: string[] = [];
  let alignment: NetplayAlignment = "unverified";
  let blockingError: string | null = null;

  let homeSideTeamId = homePlayerTeamId;
  let awaySideTeamId = awayPlayerTeamId;

  if (homeSideTeamId && !awaySideTeamId) {
    awaySideTeamId = otherTeamId(homeSideTeamId, scheduleHome, scheduleAway);
  } else if (awaySideTeamId && !homeSideTeamId) {
    homeSideTeamId = otherTeamId(awaySideTeamId, scheduleHome, scheduleAway);
  } else if (!homeSideTeamId && !awaySideTeamId) {
    homeSideTeamId = scheduleHome.teamId;
    awaySideTeamId = scheduleAway.teamId;
  }

  const verifiedHomePlayer = homePlayerTeamId != null;
  const verifiedAwayPlayer = awayPlayerTeamId != null;
  const verifiedCount = Number(verifiedHomePlayer) + Number(verifiedAwayPlayer);

  if (homeSideTeamId === awaySideTeamId) {
    alignment = "partial";
    blockingError =
      "Could not map both netplay players in the stats file to different teams for this game.";
  } else if (!hasHomeManager && !hasAwayManager) {
    alignment = "unverified";
    warnings.push(
      `Stats file lists away "${parsed.awayPlayer}" and home "${parsed.homePlayer}". Neither team has a registered manager yet, so scores were saved using the schedule home/away order.`,
    );
  } else if (verifiedCount === 0) {
    alignment = "partial";
    blockingError =
      "Netplay names in the stats file do not match either manager for this game. Confirm you are uploading to the correct matchup and that managers have linked their Rio/netplay username.";
    warnings.push(
      `File players: away "${parsed.awayPlayer}", home "${parsed.homePlayer}". Scheduled: away ${primaryNetplayLabel(scheduleAway.manager) ?? "—"}, home ${primaryNetplayLabel(scheduleHome.manager) ?? "—"}.`,
    );
  } else {
    const scheduleMatchesFile =
      homeSideTeamId === scheduleHome.teamId && awaySideTeamId === scheduleAway.teamId;

    if (verifiedCount === 2) {
      alignment = scheduleMatchesFile ? "direct" : "swapped";
      if (!scheduleMatchesFile) {
        warnings.push(
          `Schedule home/away was reversed. Stats file has home "${parsed.homePlayer}" and away "${parsed.awayPlayer}" — saved using those JSON sides.`,
        );
      }
    } else {
      alignment = "partial";
      warnings.push(
        `Stats file lists home "${parsed.homePlayer}" and away "${parsed.awayPlayer}". Saved using those JSON sides.`,
      );
      if (!verifiedHomePlayer) {
        warnings.push(
          `Home player "${parsed.homePlayer}" is not linked to an account yet — assigned to ${homeSideTeamId === scheduleHome.teamId ? scheduleHome.teamName : scheduleAway.teamName}.`,
        );
      }
      if (!verifiedAwayPlayer) {
        warnings.push(
          `Away player "${parsed.awayPlayer}" is not linked to an account yet — assigned to ${awaySideTeamId === scheduleAway.teamId ? scheduleAway.teamName : scheduleHome.teamName}.`,
        );
      }
    }
  }

  const mapping =
    blockingError == null
      ? buildMapping(
          parsed,
          scheduleHome,
          scheduleAway,
          homeSideTeamId,
          awaySideTeamId,
        )
      : buildMapping(
          parsed,
          scheduleHome,
          scheduleAway,
          scheduleHome.teamId,
          scheduleAway.teamId,
        );

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
