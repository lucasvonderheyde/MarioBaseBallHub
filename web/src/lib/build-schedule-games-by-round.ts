import type { scheduleGames } from "@/db/schema";
import type { ScheduleGameDisplay } from "@/components/league-schedule-ui";
import { toScheduleGameDisplay } from "@/lib/schedule-display";
import {
  pendingProposalsByGameId,
  type PendingScheduleProposal,
} from "@/lib/schedule-proposals";

type ScheduleGameRow = typeof scheduleGames.$inferSelect;

export function buildScheduleGamesByRound(
  games: { game: ScheduleGameRow; round: { id: string } }[],
  proposals: PendingScheduleProposal[],
): Map<string, { game: ScheduleGameDisplay }[]> {
  const proposalMap = pendingProposalsByGameId(proposals);
  const map = new Map<string, { game: ScheduleGameDisplay }[]>();

  for (const entry of games) {
    const key = entry.round.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({
      game: toScheduleGameDisplay(
        entry.game,
        proposalMap.get(entry.game.id) ?? null,
      ),
    });
  }

  return map;
}
