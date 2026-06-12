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

type ScheduleStatusFields = Pick<
  ScheduleGameDisplay,
  "homeScore" | "awayScore" | "statsRawJson" | "agreedPlayAt"
>;

export function scheduleGameCardStatus(
  game: ScheduleStatusFields,
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

export function scheduleStatusBadgeClass(status: ScheduleGameCardStatus): string {
  if (status === "played") {
    return "rounded-md border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-zinc-400";
  }
  if (status === "time_agreed") {
    return "rounded-md border border-sky-700/50 bg-sky-950/40 px-2.5 py-1 text-sky-300";
  }
  return "rounded-md border border-amber-800/50 bg-amber-950/30 px-2.5 py-1 text-amber-300";
}

/** Left-edge accent for compact schedule list rows. */
export function scheduleStatusRowClass(status: ScheduleGameCardStatus): string {
  if (status === "played") {
    return "border-zinc-800 bg-zinc-950/50";
  }
  if (status === "time_agreed") {
    return "border-sky-900/50 bg-sky-950/15";
  }
  return "border-amber-900/40 bg-amber-950/10";
}
