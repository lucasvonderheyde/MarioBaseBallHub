import type { DecodedGameSummary } from "./decode-game-file";
import {
  matchTeamsByRosterOverlap,
  type TeamRosterSnapshot,
} from "./roster-team-match";
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

export type NetplayRosterContext = {
  awayCharIds: string[];
  homeCharIds: string[];
  teamRosters: TeamRosterSnapshot[];
};

export type NetplayAlignment = "direct" | "swapped" | "partial" | "unverified";

export type NetplayTeamMatch = {
  alignment: NetplayAlignment;
  scheduleHomeScore: number;
  scheduleAwayScore: number;
  awaySideTeamId: string;
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

function resolvePlayerMapping(
  parsed: Pick<DecodedGameSummary, "homePlayer" | "awayPlayer">,
  scheduleHome: NetplayManagerContext,
  scheduleAway: NetplayManagerContext,
) {
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

  return {
    homeSideTeamId: homeSideTeamId!,
    awaySideTeamId: awaySideTeamId!,
    verifiedHomePlayer: homePlayerTeamId != null,
    verifiedAwayPlayer: awayPlayerTeamId != null,
  };
}

export function matchNetplayTeams(
  parsed: Pick<
    DecodedGameSummary,
    "homePlayer" | "awayPlayer" | "homeScore" | "awayScore"
  >,
  scheduleHome: NetplayManagerContext,
  scheduleAway: NetplayManagerContext,
  rosterContext?: NetplayRosterContext,
): NetplayTeamMatch {
  const hasHomeManager = scheduleHome.manager != null;
  const hasAwayManager = scheduleAway.manager != null;
  const warnings: string[] = [];
  let alignment: NetplayAlignment = "unverified";
  let blockingError: string | null = null;

  const playerMapping = resolvePlayerMapping(parsed, scheduleHome, scheduleAway);
  const verifiedCount =
    Number(playerMapping.verifiedHomePlayer) + Number(playerMapping.verifiedAwayPlayer);

  const rosterMapping = rosterContext
    ? matchTeamsByRosterOverlap(
        rosterContext.awayCharIds,
        rosterContext.homeCharIds,
        scheduleHome.teamId,
        scheduleAway.teamId,
        rosterContext.teamRosters,
      )
    : null;

  let homeSideTeamId = playerMapping.homeSideTeamId;
  let awaySideTeamId = playerMapping.awaySideTeamId;
  let usedRosterMatch = false;

  if (rosterMapping) {
    const playerAgrees =
      rosterMapping.awaySideTeamId === playerMapping.awaySideTeamId &&
      rosterMapping.homeSideTeamId === playerMapping.homeSideTeamId;

    const rosterStrongEnough = rosterMapping.score >= 4;
    const rosterUsable = rosterMapping.score >= 2;

    if (rosterStrongEnough || (verifiedCount === 0 && rosterUsable)) {
      homeSideTeamId = rosterMapping.homeSideTeamId;
      awaySideTeamId = rosterMapping.awaySideTeamId;
      usedRosterMatch = true;
      warnings.push(
        `Matched teams from JSON roster characters (${rosterMapping.score} lineup matches).`,
      );
      if (!playerAgrees && verifiedCount > 0) {
        warnings.push(
          "JSON roster characters disagreed with netplay name match — using JSON rosters as source of truth.",
        );
      }
    }
  }

  if (homeSideTeamId === awaySideTeamId) {
    alignment = "partial";
    blockingError =
      "Could not map both JSON teams to different schedule teams for this game.";
  } else if (!hasHomeManager && !hasAwayManager && !usedRosterMatch) {
    alignment = "unverified";
    warnings.push(
      `Stats file lists away "${parsed.awayPlayer}" and home "${parsed.homePlayer}". Neither team has a registered manager yet, so scores were saved using the schedule home/away order.`,
    );
  } else if (verifiedCount === 0 && !usedRosterMatch) {
    alignment = "partial";
    blockingError =
      "Could not match this game from JSON netplay names or roster characters. Confirm the correct game and that lineups are assigned on team rosters.";
    warnings.push(
      `File players: away "${parsed.awayPlayer}", home "${parsed.homePlayer}". Scheduled: away ${primaryNetplayLabel(scheduleAway.manager) ?? "—"}, home ${primaryNetplayLabel(scheduleHome.manager) ?? "—"}.`,
    );
  } else {
    const scheduleMatchesFile =
      homeSideTeamId === scheduleHome.teamId && awaySideTeamId === scheduleAway.teamId;

    if (verifiedCount === 2 && !usedRosterMatch) {
      alignment = scheduleMatchesFile ? "direct" : "swapped";
      if (!scheduleMatchesFile) {
        warnings.push(
          `Schedule home/away was reversed. Stats file has home "${parsed.homePlayer}" and away "${parsed.awayPlayer}".`,
        );
      }
    } else {
      alignment = "partial";
      warnings.push(
        `Stats file lists home "${parsed.homePlayer}" and away "${parsed.awayPlayer}". Character stats follow JSON away/home sides.`,
      );
      if (!playerMapping.verifiedHomePlayer) {
        warnings.push(
          `Home player "${parsed.homePlayer}" is not linked to an account yet — assigned to ${homeSideTeamId === scheduleHome.teamId ? scheduleHome.teamName : scheduleAway.teamName}.`,
        );
      }
      if (!playerMapping.verifiedAwayPlayer) {
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
