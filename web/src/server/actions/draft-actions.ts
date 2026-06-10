"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  characters,
  draftPicks,
  rosterInstances,
  seasonDrafts,
  teams,
} from "@/db/schema";
import {
  isDraftFinished,
  teamIdForPickIndex,
} from "@/domain/draft/snake-order";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getManagedTeamInSeason } from "@/lib/manager-team";
import {
  getOrCreateSeasonDraft,
  getSeasonDraftView,
} from "@/lib/season-draft";
import { recordSeasonEvent } from "@/lib/season-events";
import { newUuid } from "@/server/ids";

function parseTeamOrder(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

function revalidateDraftPaths(leagueId: string, seasonId: string) {
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}/draft`);
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`);
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}/rosters`);
}

export async function startDraftAction(input: {
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Forbidden." };

  const teamRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.seasonId, input.seasonId));
  if (teamRows.length < 2) {
    return { error: "Add at least two teams before starting the draft." };
  }

  const shuffled = [...teamRows.map((team) => team.id)];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  await getOrCreateSeasonDraft(input.seasonId);
  await db
    .update(seasonDrafts)
    .set({
      status: "active",
      teamOrderJson: JSON.stringify(shuffled),
      currentPickIndex: 0,
      updatedAt: new Date(),
    })
    .where(eq(seasonDrafts.seasonId, input.seasonId));

  await recordSeasonEvent({
    seasonId: input.seasonId,
    eventType: "draft_started",
    message: "Live draft started.",
  });

  revalidateDraftPaths(input.leagueId, input.seasonId);
  return {};
}

export async function redraftAction(input: {
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Forbidden." };

  await db.delete(draftPicks).where(eq(draftPicks.seasonId, input.seasonId));
  await db
    .update(rosterInstances)
    .set({ teamId: null })
    .where(eq(rosterInstances.seasonId, input.seasonId));

  const teamRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.seasonId, input.seasonId));
  const shuffled = [...teamRows.map((team) => team.id)];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  await getOrCreateSeasonDraft(input.seasonId);
  await db
    .update(seasonDrafts)
    .set({
      status: "active",
      teamOrderJson: JSON.stringify(shuffled),
      currentPickIndex: 0,
      updatedAt: new Date(),
    })
    .where(eq(seasonDrafts.seasonId, input.seasonId));

  await recordSeasonEvent({
    seasonId: input.seasonId,
    eventType: "draft_redraft",
    message: "Draft reset — rosters cleared for a new draft.",
  });

  revalidateDraftPaths(input.leagueId, input.seasonId);
  return {};
}

export async function lockDraftAction(input: {
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Forbidden." };

  await db
    .update(seasonDrafts)
    .set({ status: "locked", updatedAt: new Date() })
    .where(eq(seasonDrafts.seasonId, input.seasonId));

  revalidateDraftPaths(input.leagueId, input.seasonId);
  return {};
}

export async function makeDraftPickAction(input: {
  leagueId: string;
  seasonId: string;
  rosterInstanceId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (!role) return { error: "Forbidden." };

  const draft = await getOrCreateSeasonDraft(input.seasonId);
  if (draft.status !== "active") {
    return { error: "The draft is not active." };
  }

  const teamOrder = parseTeamOrder(draft.teamOrderJson);
  const onClockTeamId = teamIdForPickIndex(teamOrder, draft.currentPickIndex);
  if (!onClockTeamId) return { error: "Draft is complete." };

  const userTeam = await getManagedTeamInSeason(user.id, input.seasonId);
  if (role !== "admin" && userTeam?.id !== onClockTeamId) {
    return { error: "It is not your turn to pick." };
  }

  const [instance] = await db
    .select({
      id: rosterInstances.id,
      teamId: rosterInstances.teamId,
      displayName: characters.displayName,
    })
    .from(rosterInstances)
    .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
    .where(
      and(
        eq(rosterInstances.id, input.rosterInstanceId),
        eq(rosterInstances.seasonId, input.seasonId),
        isNull(rosterInstances.teamId),
      ),
    )
    .limit(1);
  if (!instance) return { error: "Character is not available." };

  const pickNumber = draft.currentPickIndex + 1;
  await db.insert(draftPicks).values({
    id: newUuid(),
    seasonId: input.seasonId,
    pickNumber,
    teamId: onClockTeamId,
    rosterInstanceId: instance.id,
    pickedByUserId: user.id,
    createdAt: new Date(),
  });

  await db
    .update(rosterInstances)
    .set({ teamId: onClockTeamId })
    .where(eq(rosterInstances.id, instance.id));

  const nextPickIndex = draft.currentPickIndex + 1;
  const finished = isDraftFinished(
    teamOrder.length,
    draft.picksPerTeam,
    nextPickIndex,
  );

  await db
    .update(seasonDrafts)
    .set({
      currentPickIndex: nextPickIndex,
      status: finished ? "complete" : "active",
      updatedAt: new Date(),
    })
    .where(eq(seasonDrafts.seasonId, input.seasonId));

  const [team] = await db
    .select({ name: teams.name })
    .from(teams)
    .where(eq(teams.id, onClockTeamId))
    .limit(1);

  await recordSeasonEvent({
    seasonId: input.seasonId,
    eventType: "draft_pick",
    message: `${team?.name ?? "Team"} drafted ${instance.displayName} (pick ${pickNumber}).`,
  });

  revalidateDraftPaths(input.leagueId, input.seasonId);
  return {};
}

export async function getDraftStateForSeason(seasonId: string) {
  return getSeasonDraftView(seasonId);
}
