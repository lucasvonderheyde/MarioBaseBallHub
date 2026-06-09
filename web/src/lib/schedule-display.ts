import type { scheduleGames } from "@/db/schema";
import type { ScheduleGameDisplay } from "@/components/league-schedule-ui";
import type { PendingScheduleProposal } from "@/lib/schedule-proposals";

type ScheduleGameRow = typeof scheduleGames.$inferSelect;

export function toScheduleGameDisplay(
  game: ScheduleGameRow,
  pendingProposal?: PendingScheduleProposal | null,
): ScheduleGameDisplay {
  return {
    id: game.id,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    playedAt: game.playedAt,
    slotInRound: game.slotInRound,
    statsGameId: game.statsGameId,
    statsRawJson: game.statsRawJson,
    youtubeUrl: game.youtubeUrl,
    agreedPlayAt: game.agreedPlayAt,
    pendingProposal: pendingProposal
      ? {
          id: pendingProposal.id,
          proposedByUserId: pendingProposal.proposedByUserId,
          proposedPlayAt: pendingProposal.proposedPlayAt,
          note: pendingProposal.note,
        }
      : null,
  };
}

export type ScheduleGameCardStatus = "played" | "time_agreed" | "awaiting_time";

export function scheduleGameCardStatus(
  game: ScheduleGameDisplay,
): ScheduleGameCardStatus {
  if (
    (game.homeScore != null && game.awayScore != null) ||
    game.statsRawJson
  ) {
    return "played";
  }
  if (game.agreedPlayAt) return "time_agreed";
  return "awaiting_time";
}

export function scheduleStatusLabel(status: ScheduleGameCardStatus): string {
  if (status === "played") return "Completed";
  if (status === "time_agreed") return "Time agreed";
  return "Awaiting time";
}
