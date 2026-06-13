import type { GameMvpPick } from "@/domain/stats/compute-game-mvp";

export function formatGameMvpBriefLine(
  mvp: GameMvpPick,
  charDisplayName: string,
  teamName: string,
): string {
  return `Game MVP: ${charDisplayName} (${teamName}, ${mvp.teamSide}) — ${mvp.summary}`;
}

export function winningTeamIdFromScore(
  awayScore: number,
  homeScore: number,
  awayTeamId: string,
  homeTeamId: string,
): string | null {
  if (awayScore > homeScore) return awayTeamId;
  if (homeScore > awayScore) return homeTeamId;
  return null;
}
