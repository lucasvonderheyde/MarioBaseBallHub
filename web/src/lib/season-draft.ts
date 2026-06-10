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

export async function getSeasonDraftView(seasonId: string): Promise<SeasonDraftView> {
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
  };
}

export function draftIsEditable(
  draftStatus: DraftStatus,
  seasonStatus: "setup" | "active" | "completed",
): boolean {
  return seasonStatus === "setup" && draftStatus === "active";
}

export function canAdminRedraft(seasonStatus: "setup" | "active" | "completed"): boolean {
  return seasonStatus === "setup" || seasonStatus === "active";
}

export { isDraftFinished, teamIdForPickIndex, totalDraftPicks };
