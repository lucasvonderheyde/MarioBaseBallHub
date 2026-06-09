import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameScheduleProposals } from "@/db/schema";

export type PendingScheduleProposal = {
  id: string;
  gameId: string;
  proposedByUserId: string;
  proposedPlayAt: Date;
  note: string | null;
};

export async function getPendingScheduleProposalsForSeason(
  seasonId: string,
): Promise<PendingScheduleProposal[]> {
  const rows = await db
    .select({
      id: gameScheduleProposals.id,
      gameId: gameScheduleProposals.gameId,
      proposedByUserId: gameScheduleProposals.proposedByUserId,
      proposedPlayAt: gameScheduleProposals.proposedPlayAt,
      note: gameScheduleProposals.note,
    })
    .from(gameScheduleProposals)
    .where(
      and(
        eq(gameScheduleProposals.seasonId, seasonId),
        eq(gameScheduleProposals.status, "pending"),
      ),
    );

  return rows;
}

export function pendingProposalsByGameId(
  proposals: PendingScheduleProposal[],
): Map<string, PendingScheduleProposal> {
  return new Map(proposals.map((proposal) => [proposal.gameId, proposal]));
}
