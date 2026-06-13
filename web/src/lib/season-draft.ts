import { and, asc, eq, isNull, sql } from "drizzle-orm";
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
  totalDraftPicks,
} from "@/domain/draft/snake-order";

export type DraftStatus = "locked" | "active" | "complete";

export type DraftPickRow = {
  pickNumber: number;
  teamId: string;
  teamName: string;
  rosterInstanceId: string;
  gameCharId: string;
  displayName: string;
  copyIndex: number;
};

export type SeasonDraftView = {
  status: DraftStatus;
  teamOrder: string[];
  currentPickIndex: number;
  picksPerTeam: number;
  teamOnClockId: string | null;
  teamOnClockName: string | null;
  totalPicks: number;
  picks: DraftPickRow[];
  availableCount: number;
  pickClockSeconds: number | null;
  /** When the current pick's clock expires; null when no clock is set. */
  pickDeadline: Date | null;
  /** First-round order as team names, for pre-draft display. */
  teamOrderNames: string[];
};

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

export async function getOrCreateSeasonDraft(seasonId: string) {
  const [existing] = await db
    .select()
    .from(seasonDrafts)
    .where(eq(seasonDrafts.seasonId, seasonId))
    .limit(1);
  if (existing) return existing;

  await db.insert(seasonDrafts).values({
    seasonId,
    status: "locked",
    teamOrderJson: "[]",
    currentPickIndex: 0,
    picksPerTeam: 9,
    updatedAt: new Date(),
  });

  const [created] = await db
    .select()
    .from(seasonDrafts)
    .where(eq(seasonDrafts.seasonId, seasonId))
    .limit(1);
  return created!;
}

/**
 * Lazily enforces the pick clock: every expired pick window since the clock
 * started is skipped (forfeited), so the draft stays live even when nobody
 * acted for several windows. Runs on draft page loads and polls.
 */
export async function enforceDraftClock(seasonId: string): Promise<void> {
  const draft = await getOrCreateSeasonDraft(seasonId);
  if (
    draft.status !== "active" ||
    !draft.pickClockSeconds ||
    !draft.currentPickStartedAt
  ) {
    return;
  }

  const clockMs = draft.pickClockSeconds * 1000;
  const teamOrder = parseTeamOrder(draft.teamOrderJson);
  let pickIndex = draft.currentPickIndex;
  let windowStart = draft.currentPickStartedAt.getTime();
  let skipped = 0;

  while (
    Date.now() >= windowStart + clockMs &&
    teamIdForPickIndex(teamOrder, pickIndex) != null
  ) {
    pickIndex += 1;
    windowStart += clockMs;
    skipped += 1;
  }
  if (skipped === 0) return;

  const finished = isDraftFinished(teamOrder.length, draft.picksPerTeam, pickIndex);
  await db
    .update(seasonDrafts)
    .set({
      currentPickIndex: pickIndex,
      status: finished ? "complete" : "active",
      currentPickStartedAt: finished ? null : new Date(windowStart),
      updatedAt: new Date(),
    })
    .where(eq(seasonDrafts.seasonId, seasonId));
}

export async function getSeasonDraftView(seasonId: string): Promise<SeasonDraftView> {
  await enforceDraftClock(seasonId);
  const draft = await getOrCreateSeasonDraft(seasonId);
  const teamOrder = parseTeamOrder(draft.teamOrderJson);
  const teamRows = await db.select().from(teams).where(eq(teams.seasonId, seasonId));
  const teamNames = new Map(teamRows.map((team) => [team.id, team.name]));

  const pickRows = await db
    .select({
      pickNumber: draftPicks.pickNumber,
      teamId: draftPicks.teamId,
      rosterInstanceId: draftPicks.rosterInstanceId,
      copyIndex: rosterInstances.copyIndex,
      gameCharId: characters.gameCharId,
      displayName: characters.displayName,
    })
    .from(draftPicks)
    .innerJoin(
      rosterInstances,
      eq(draftPicks.rosterInstanceId, rosterInstances.id),
    )
    .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
    .where(eq(draftPicks.seasonId, seasonId))
    .orderBy(asc(draftPicks.pickNumber));

  const [unassignedRow] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(rosterInstances)
    .where(
      and(eq(rosterInstances.seasonId, seasonId), isNull(rosterInstances.teamId)),
    );
  const unassignedCount = unassignedRow?.count ?? 0;

  const onClockId =
    draft.status === "active"
      ? teamIdForPickIndex(teamOrder, draft.currentPickIndex)
      : null;

  return {
    status: draft.status,
    teamOrder,
    currentPickIndex: draft.currentPickIndex,
    picksPerTeam: draft.picksPerTeam,
    teamOnClockId: onClockId,
    teamOnClockName: onClockId ? teamNames.get(onClockId) ?? null : null,
    totalPicks: totalDraftPicks(teamOrder.length, draft.picksPerTeam),
    picks: pickRows.map((row) => ({
      pickNumber: row.pickNumber,
      teamId: row.teamId,
      teamName: teamNames.get(row.teamId) ?? "Team",
      rosterInstanceId: row.rosterInstanceId,
      gameCharId: row.gameCharId,
      displayName: row.displayName,
      copyIndex: row.copyIndex,
    })),
    availableCount: unassignedCount,
    teamOrderNames: teamOrder.map((teamId) => teamNames.get(teamId) ?? "Team"),
    pickClockSeconds: draft.pickClockSeconds ?? null,
    pickDeadline:
      draft.status === "active" &&
      draft.pickClockSeconds &&
      draft.currentPickStartedAt
        ? new Date(
            draft.currentPickStartedAt.getTime() + draft.pickClockSeconds * 1000,
          )
        : null,
  };
}

export function draftIsEditable(
  draftStatus: DraftStatus,
  seasonStatus: "setup" | "active" | "completed",
): boolean {
  return seasonStatus === "setup" && draftStatus === "active";
}

export function canAdminRedraft(seasonStatus: "setup" | "active" | "completed"): boolean {
  return seasonStatus === "setup";
}

export { isDraftFinished, teamIdForPickIndex, totalDraftPicks };
