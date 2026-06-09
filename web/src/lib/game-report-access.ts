export type LeagueRole = "admin" | "manager";

/** True when the user manages either team in the game (not league admins unless they manage a team). */
export function isUserGameParticipant(
  userId: string,
  homeManagerUserId: string | null | undefined,
  awayManagerUserId: string | null | undefined,
): boolean {
  return userId === homeManagerUserId || userId === awayManagerUserId;
}

/** Admins and managers of either team in the game may upload stats. */
export function canUserReportGame(
  userId: string,
  role: LeagueRole | null,
  homeManagerUserId: string | null | undefined,
  awayManagerUserId: string | null | undefined,
): boolean {
  if (role === "admin") return true;
  if (!role) return false;
  return isUserGameParticipant(userId, homeManagerUserId, awayManagerUserId);
}
