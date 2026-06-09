import type { LeagueRole } from "@/lib/game-report-access";
import {
  managerNetplayLabels,
  netplayLabelMatches,
  type NetplayUserLike,
} from "@/lib/netplay-label";

/** True when the user's netplay labels match Away or Home Player in the stats file. */
export function isUserNetplayParticipantInFile(
  user: NetplayUserLike,
  awayPlayer: string,
  homePlayer: string,
): boolean {
  const labels = managerNetplayLabels(user);
  return (
    netplayLabelMatches(labels, awayPlayer) ||
    netplayLabelMatches(labels, homePlayer)
  );
}

/**
 * League admins may upload any game in the league. Managers must appear in the
 * JSON as Home Player or Away Player (set netplay username on Account).
 */
export function netplayParticipantError(
  user: NetplayUserLike,
  role: LeagueRole,
  awayPlayer: string,
  homePlayer: string,
): string | null {
  if (role === "admin") return null;
  if (isUserNetplayParticipantInFile(user, awayPlayer, homePlayer)) return null;
  return (
    "Your Rio/netplay username must match Home Player or Away Player in this file. " +
    "Update it on your Account page, then try again."
  );
}

/** Blocks linking a GameID to a different scheduled game; same game is allowed (re-upload). */
export function gameIdLinkError(
  statsGameId: string,
  targetGameId: string,
  existingLinkedGameId: string | undefined,
): string | null {
  if (existingLinkedGameId && existingLinkedGameId !== targetGameId) {
    return "This stats file (GameID) is already linked to another game.";
  }
  return null;
}
