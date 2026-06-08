"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  characters,
  rosterInstances,
  rounds,
  scheduleGames,
  seasonCharacterPool,
  teams,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSeasonLeagueId, getLeagueRole } from "@/lib/league-access";
import { redirectWithFormError } from "@/server/flash-redirect";
import { newUuid } from "@/server/ids";
import { deleteCharacterGameStatsForGame } from "@/server/persist-game-stats";

export async function createTeamAction(seasonId: string, formData: FormData) {
  const user = await requireUser();
  const leagueId = await getSeasonLeagueId(seasonId);
  if (!leagueId) redirectWithFormError("/leagues", "Season not found.");
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin")
    redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  const name = String(formData.get("name") ?? "").trim();
  const managerUsername = String(formData.get("managerUsername") ?? "").trim();
  const claimUsername = String(formData.get("claimUsername") ?? "").trim();
  const homeStadium = String(formData.get("homeStadium") ?? "").trim();
  if (!name)
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}`,
      "Team name required.",
    );
  let managerUserId: string | null = null;
  if (managerUsername) {
    const [m] = await db
      .select()
      .from(users)
      .where(eq(users.username, managerUsername))
      .limit(1);
    if (!m)
      redirectWithFormError(
        `/leagues/${leagueId}/seasons/${seasonId}`,
        "Manager username not found.",
      );
    managerUserId = m.id;
  }
  await db.insert(teams).values({
    id: newUuid(),
    seasonId,
    name,
    managerUserId,
    claimUsername: claimUsername || null,
    homeStadiumGameId: homeStadium || null,
  });
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}`);
}

export async function updateTeamAction(
  teamId: string,
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team || team.seasonId !== seasonId) {
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}`,
      "Team not found.",
    );
  }
  const isAdmin = role === "admin";
  const isManager = team.managerUserId === user.id;
  if (!isAdmin && !isManager) {
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}`,
      "Forbidden.",
    );
  }

  const name = String(formData.get("name") ?? "").trim();
  const homeStadium = String(formData.get("homeStadium") ?? "").trim();
  if (!name) {
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}`,
      "Team name required.",
    );
  }

  if (isAdmin) {
    const managerUsername = String(formData.get("managerUsername") ?? "").trim();
    const claimUsername = String(formData.get("claimUsername") ?? "").trim();
    let managerUserId: string | null = null;
    let claimUsernameValue: string | null = null;

    if (managerUsername) {
      const [m] = await db
        .select()
        .from(users)
        .where(eq(users.username, managerUsername))
        .limit(1);
      if (!m)
        redirectWithFormError(
          `/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}`,
          "Manager username not found.",
        );
      managerUserId = m.id;
    } else {
      claimUsernameValue = claimUsername || null;
    }

    await db
      .update(teams)
      .set({
        name,
        managerUserId,
        claimUsername: claimUsernameValue,
        homeStadiumGameId: homeStadium || null,
      })
      .where(eq(teams.id, teamId));
  } else {
    await db
      .update(teams)
      .set({
        name,
        homeStadiumGameId: homeStadium || null,
      })
      .where(eq(teams.id, teamId));
  }
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}?m=updated`);
}

export async function savePoolAction(seasonId: string, formData: FormData) {
  const user = await requireUser();
  const leagueId = (await getSeasonLeagueId(seasonId))!;
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin")
    redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  const allChars = await db.select({ id: characters.id }).from(characters);
  for (const c of allChars) {
    const raw = formData.get(`pool_${c.id}`);
    const n =
      raw == null || raw === ""
        ? 0
        : Math.min(99, Math.max(0, Number(raw)));
    if (!Number.isFinite(n)) continue;

    if (n === 0) {
      const assigned = await db
        .select({ id: rosterInstances.id })
        .from(rosterInstances)
        .where(
          and(
            eq(rosterInstances.seasonId, seasonId),
            eq(rosterInstances.characterId, c.id),
            sql`${rosterInstances.teamId} IS NOT NULL`,
          ),
        );
      if (assigned.length > 0) {
        redirectWithFormError(
          `/leagues/${leagueId}/seasons/${seasonId}`,
          "Remove characters from team rosters before setting pool count to 0.",
        );
      }
      await db
        .delete(rosterInstances)
        .where(
          and(
            eq(rosterInstances.seasonId, seasonId),
            eq(rosterInstances.characterId, c.id),
          ),
        );
      await db
        .delete(seasonCharacterPool)
        .where(
          and(
            eq(seasonCharacterPool.seasonId, seasonId),
            eq(seasonCharacterPool.characterId, c.id),
          ),
        );
      continue;
    }

    await db
      .insert(seasonCharacterPool)
      .values({ seasonId, characterId: c.id, leagueCopies: n })
      .onConflictDoUpdate({
        target: [seasonCharacterPool.seasonId, seasonCharacterPool.characterId],
        set: { leagueCopies: n },
      });

    for (let copyIndex = 1; copyIndex <= n; copyIndex++) {
      const existing = await db
        .select()
        .from(rosterInstances)
        .where(
          and(
            eq(rosterInstances.seasonId, seasonId),
            eq(rosterInstances.characterId, c.id),
            eq(rosterInstances.copyIndex, copyIndex),
          ),
        )
        .limit(1);
      if (!existing[0]) {
        await db.insert(rosterInstances).values({
          id: newUuid(),
          seasonId,
          characterId: c.id,
          copyIndex,
          teamId: null,
        });
      }
    }

    const toRemove = await db
      .select()
      .from(rosterInstances)
      .where(
        and(
          eq(rosterInstances.seasonId, seasonId),
          eq(rosterInstances.characterId, c.id),
          gt(rosterInstances.copyIndex, n),
        ),
      );
    for (const r of toRemove) {
      if (r.teamId) {
        redirectWithFormError(
          `/leagues/${leagueId}/seasons/${seasonId}`,
          "Cannot shrink pool: unassign roster copies above the new count first.",
        );
      }
      await db.delete(rosterInstances).where(eq(rosterInstances.id, r.id));
    }
  }
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}`);
}

export async function assignRosterFormAction(formData: FormData) {
  const instanceId = String(formData.get("instanceId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const leagueId = String(formData.get("leagueId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!instanceId || !seasonId || !leagueId)
    redirectWithFormError("/leagues", "Missing roster fields.");
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin")
    redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}/rosters`, "Forbidden.");
  await db
    .update(rosterInstances)
    .set({ teamId: teamId || null })
    .where(eq(rosterInstances.id, instanceId));
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}/rosters`);
}

export async function createRoundAction(
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin")
    redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  const phase = String(formData.get("phase") ?? "regular") as "regular" | "playoffs";
  const roundNumber = Number(formData.get("roundNumber") ?? 1);
  if (!Number.isFinite(roundNumber) || roundNumber < 1)
    redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}`, "Invalid round number.");
  await db
    .insert(rounds)
    .values({ id: newUuid(), seasonId, phase, roundNumber })
    .onConflictDoNothing({
      target: [rounds.seasonId, rounds.phase, rounds.roundNumber],
    });
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}`);
}

export async function addScheduleGameAction(
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin")
    redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  const roundId = String(formData.get("roundId") ?? "");
  const slot = Number(formData.get("slot") ?? 1);
  const homeTeamId = String(formData.get("homeTeamId") ?? "");
  const awayTeamId = String(formData.get("awayTeamId") ?? "");
  if (!roundId || !homeTeamId || !awayTeamId)
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}`,
      "Round and teams required.",
    );
  await db
    .insert(scheduleGames)
    .values({
      id: newUuid(),
      roundId,
      slotInRound: slot,
      homeTeamId,
      awayTeamId,
    })
    .onConflictDoNothing({
      target: [scheduleGames.roundId, scheduleGames.slotInRound],
    });
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}`);
}

export async function saveYoutubeFormAction(formData: FormData) {
  const gameId = String(formData.get("gameId") ?? "");
  const leagueId = String(formData.get("leagueId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const url = String(formData.get("youtube") ?? "");
  if (!gameId || !leagueId || !seasonId) return;
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (!role) redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  await db
    .update(scheduleGames)
    .set({ youtubeUrl: url.trim() || null })
    .where(eq(scheduleGames.id, gameId));
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}`);
}

export async function clearGameStatsAction(
  gameId: string,
  leagueId: string,
  seasonId: string,
  _formData?: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin")
    redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  await deleteCharacterGameStatsForGame(gameId);
  await db
    .update(scheduleGames)
    .set({
      homeScore: null,
      awayScore: null,
      statsGameId: null,
      statsRawJson: null,
      statsStadiumId: null,
      playedAt: null,
    })
    .where(eq(scheduleGames.id, gameId));
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}`);
}
