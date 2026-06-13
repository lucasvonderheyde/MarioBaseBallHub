import { getAppUrl } from "@/lib/app-url";

export function leaguePostPageHref(
  leagueId: string,
  seasonId: string,
  postId: string,
): string {
  return `/leagues/${leagueId}/seasons/${seasonId}/news/${postId}`;
}

export function gameRecapPageHref(
  leagueId: string,
  seasonId: string,
  gameId: string,
): string {
  return `/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}#inky-recap`;
}

export function leaguePostAbsoluteUrl(
  leagueId: string,
  seasonId: string,
  postId: string,
): string {
  return `${getAppUrl()}/${leaguePostPageHref(leagueId, seasonId, postId).slice(1)}`;
}
