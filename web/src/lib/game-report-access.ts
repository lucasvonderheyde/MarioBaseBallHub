export type LeagueRole = "admin" | "manager";

/** Admins and managers of either team in the game may upload stats. */
export function canUserReportGame(
  userId: string,
  role: LeagueRole | null,
  homeManagerUserId: string | null | undefined,
  awayManagerUserId: string | null | undefined,
): boolean {
  if (role === "admin") return true;
  if (!role) return false;
  return userId === homeManagerUserId || userId === awayManagerUserId;
}
