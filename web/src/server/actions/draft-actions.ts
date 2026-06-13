"use server";

import crypto from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  characters,
  draftPicks,
  rosterInstances,
  seasonDrafts,
  seasons,
  teams,
} from "@/db/schema";
import {
  lotteryWeightsFromStandings,
  runDraftLottery,
} from "@/domain/draft/lottery";
import {
  isDraftFinished,
  teamIdForPickIndex,
} from "@/domain/draft/snake-order";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getManagedTeamInSeason } from "@/lib/manager-team";
import {
  getOrCreateSeasonDraft,
  getSeasonDraftView,
} from "@/lib/season-draft";
import { recordSeasonEvent } from "@/lib/season-events";
import { seasonHasReportedGames } from "@/lib/season-has-reported-games";
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
  pickClockSeconds?: number | null;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Forbidden." };
  if (await seasonHasReportedGames(input.seasonId)) {
    return { error: "Cannot start a draft after games have been reported." };
  }

  const teamRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.seasonId, input.seasonId));
  if (teamRows.length < 2) {
    return { error: "Add at least two teams before starting the draft." };
  }

  const teamIds = teamRows.map((team) => team.id);

  // Keep a pre-set order (e.g. from the lottery) when it covers the
  // current teams exactly; otherwise fall back to a random shuffle.
  const draft = await getOrCreateSeasonDraft(input.seasonId);
  const presetOrder = parseTeamOrder(draft.teamOrderJson);
  const presetMatches =
    presetOrder.length === teamIds.length &&
    teamIds.every((id) => presetOrder.includes(id));

  let order: string[];
  if (presetMatches) {
    order = presetOrder;
  } else {
    order = [...teamIds];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
  }

  const pickClockSeconds =
    input.pickClockSeconds && input.pickClockSeconds > 0
      ? Math.min(input.pickClockSeconds, 3600)
      : null;

  await db
    .update(seasonDrafts)
    .set({
      status: "active",
      teamOrderJson: JSON.stringify(order),
      currentPickIndex: 0,
      pickClockSeconds,
      currentPickStartedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(seasonDrafts.seasonId, input.seasonId));

  await recordSeasonEvent({
    seasonId: input.seasonId,
    eventType: "draft_started",
    message: pickClockSeconds
      ? `Live draft started — ${pickClockSeconds}s pick clock.`
      : "Live draft started.",
  });

  revalidateDraftPaths(input.leagueId, input.seasonId);
  return {};
}

export async function runDraftLotteryAction(input: {
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Forbidden." };

  const draft = await getOrCreateSeasonDraft(input.seasonId);
  if (draft.status !== "locked") {
    return { error: "The lottery can only run before the draft starts." };
  }

  const teamRows = await db
    .select({ id: teams.id, name: teams.name, managerUserId: teams.managerUserId })
    .from(teams)
    .where(eq(teams.seasonId, input.seasonId));
  if (teamRows.length < 2) {
    return { error: "Add at least two teams before running the lottery." };
  }

  const ranking = await rankTeamsByPreviousSeason(
    input.leagueId,
    input.seasonId,
    teamRows,
  );
  const order = runDraftLottery(
    lotteryWeightsFromStandings(ranking),
    crypto.randomInt(2 ** 31),
  );

  await db
    .update(seasonDrafts)
    .set({ teamOrderJson: JSON.stringify(order), updatedAt: new Date() })
    .where(eq(seasonDrafts.seasonId, input.seasonId));

  const teamName = new Map(teamRows.map((team) => [team.id, team.name]));
  const orderLabel = order
    .map((teamId, index) => `${index + 1}. ${teamName.get(teamId) ?? "Team"}`)
    .join("  ");
  await recordSeasonEvent({
    seasonId: input.seasonId,
    eventType: "draft_lottery",
    message: `Draft lottery results: ${orderLabel}`,
  });

  revalidateDraftPaths(input.leagueId, input.seasonId);
  return {};
}

/**
 * Best-to-worst ranking of this season's teams using the previous season's
 * final standings, matched by manager. Teams without a previous-season
 * manager record rank last (most lottery balls).
 */
async function rankTeamsByPreviousSeason(
  leagueId: string,
  seasonId: string,
  teamRows: { id: string; managerUserId: string | null }[],
): Promise<string[]> {
  const seasonRows = await db
    .select({ id: seasons.id, createdAt: seasons.createdAt, status: seasons.status })
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));
  const previous = seasonRows
    .filter((season) => season.id !== seasonId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .sort((a, b) =>
      (a.status === "completed" ? 0 : 1) - (b.status === "completed" ? 0 : 1),
    )[0];

  if (!previous) return teamRows.map((team) => team.id);

  const dash = await getSeasonDashboard(previous.id);
  if (!dash) return teamRows.map((team) => team.id);

  const previousTeamRank = new Map<string, number>();
  dash.standings.forEach((row, index) => {
    previousTeamRank.set(row.teamId, index);
  });
  const previousManagerRank = new Map<string, number>();
  for (const { team } of dash.teams) {
    const rank = previousTeamRank.get(team.id);
    if (rank != null && team.managerUserId) {
      previousManagerRank.set(team.managerUserId, rank);
    }
  }

  return [...teamRows]
    .sort((a, b) => {
      const rankA = a.managerUserId != null
        ? previousManagerRank.get(a.managerUserId) ?? Number.POSITIVE_INFINITY
        : Number.POSITIVE_INFINITY;
      const rankB = b.managerUserId != null
        ? previousManagerRank.get(b.managerUserId) ?? Number.POSITIVE_INFINITY
        : Number.POSITIVE_INFINITY;
      return rankA - rankB;
    })
    .map((team) => team.id);
}

export async function redraftAction(input: {
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Forbidden." };

  const [season] = await db
    .select({ status: seasons.status })
    .from(seasons)
    .where(eq(seasons.id, input.seasonId))
    .limit(1);
  if (!season || season.status !== "setup") {
    return { error: "Redraft is only available during season setup." };
  }
  if (await seasonHasReportedGames(input.seasonId)) {
    return { error: "Cannot redraft after games have been reported." };
  }

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
  if (await seasonHasReportedGames(input.seasonId)) {
    return { error: "The draft is locked once games have been reported." };
  }

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
      currentPickStartedAt: finished ? null : new Date(),
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
