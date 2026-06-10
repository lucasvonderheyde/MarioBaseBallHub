"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { seasonAwardVotes, seasons, teams } from "@/db/schema";
import { isAwardCategory } from "@/domain/awards/award-categories";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { recordSeasonEvent } from "@/lib/season-events";
import { redirectWithFormError } from "@/server/flash-redirect";

export async function openAwardVotingAction(input: {
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Forbidden." };

  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, input.seasonId))
    .limit(1);
  if (!season || season.leagueId !== input.leagueId) {
    return { error: "Season not found." };
  }

  await db
    .update(seasons)
    .set({ awardVotingOpen: true })
    .where(eq(seasons.id, input.seasonId));

  await recordSeasonEvent({
    seasonId: input.seasonId,
    eventType: "award_voting_open",
    message: "End-of-season award voting is now open.",
  });

  revalidatePath(`/leagues/${input.leagueId}/seasons/${input.seasonId}`);
  revalidatePath(`/leagues/${input.leagueId}/seasons/${input.seasonId}/awards`);
  revalidatePath(`/leagues/${input.leagueId}/seasons/${input.seasonId}/admin`);
  return {};
}

export async function closeAwardVotingAction(input: {
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Forbidden." };

  await db
    .update(seasons)
    .set({ awardVotingOpen: false })
    .where(eq(seasons.id, input.seasonId));

  revalidatePath(`/leagues/${input.leagueId}/seasons/${input.seasonId}`);
  revalidatePath(`/leagues/${input.leagueId}/seasons/${input.seasonId}/awards`);
  return {};
}

export async function castAwardVoteAction(input: {
  leagueId: string;
  seasonId: string;
  category: string;
  teamId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (!role) return { error: "Forbidden." };

  if (!isAwardCategory(input.category)) {
    return { error: "Invalid award category." };
  }

  const [season] = await db
    .select({ awardVotingOpen: seasons.awardVotingOpen })
    .from(seasons)
    .where(eq(seasons.id, input.seasonId))
    .limit(1);
  if (!season?.awardVotingOpen) {
    return { error: "Award voting is not open for this season." };
  }

  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, input.teamId), eq(teams.seasonId, input.seasonId)))
    .limit(1);
  if (!team) return { error: "Team not found." };

  await db
    .insert(seasonAwardVotes)
    .values({
      seasonId: input.seasonId,
      voterUserId: user.id,
      category: input.category,
      teamId: input.teamId,
    })
    .onConflictDoUpdate({
      target: [
        seasonAwardVotes.seasonId,
        seasonAwardVotes.voterUserId,
        seasonAwardVotes.category,
      ],
      set: { teamId: input.teamId },
    });

  revalidatePath(`/leagues/${input.leagueId}/seasons/${input.seasonId}/awards`);
  return {};
}

export async function getAwardVoteResults(seasonId: string) {
  const rows = await db
    .select({
      category: seasonAwardVotes.category,
      teamId: seasonAwardVotes.teamId,
      teamName: teams.name,
      votes: sql<number>`count(*)`.mapWith(Number),
    })
    .from(seasonAwardVotes)
    .innerJoin(teams, eq(seasonAwardVotes.teamId, teams.id))
    .where(eq(seasonAwardVotes.seasonId, seasonId))
    .groupBy(
      seasonAwardVotes.category,
      seasonAwardVotes.teamId,
      teams.name,
    );

  return rows;
}

export async function openAwardVotingFormAction(seasonId: string, leagueId: string) {
  const result = await openAwardVotingAction({ leagueId, seasonId });
  if (result.error) {
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}/admin`,
      result.error,
    );
  }
  redirect(`/leagues/${leagueId}/seasons/${seasonId}/admin?m=award-voting-open`);
}

export async function closeAwardVotingFormAction(seasonId: string, leagueId: string) {
  const result = await closeAwardVotingAction({ leagueId, seasonId });
  if (result.error) {
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}/admin`,
      result.error,
    );
  }
  redirect(`/leagues/${leagueId}/seasons/${seasonId}/admin?m=award-voting-closed`);
}

export async function getUserAwardVotes(userId: string, seasonId: string) {
  const rows = await db
    .select()
    .from(seasonAwardVotes)
    .where(
      and(
        eq(seasonAwardVotes.seasonId, seasonId),
        eq(seasonAwardVotes.voterUserId, userId),
      ),
    );
  return new Map(rows.map((row) => [row.category, row.teamId]));
}
