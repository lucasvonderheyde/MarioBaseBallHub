"use server";

import { and, asc, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  characters,
  rosterInstances,
  rounds,
  scheduleGames,
  seasonCharacterPool,
  seasons,
  teams,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSeasonLeagueId, getLeagueRole } from "@/lib/league-access";
import { canUserReportGame } from "@/lib/game-report-access";
import {
  countTeamRosterInstances,
  minimumRosterError,
  MIN_TEAM_ROSTER_SIZE,
} from "@/lib/roster-rules";
import {
  parsePlayoffSettings,
  serializePlayoffSettings,
} from "@/domain/playoffs/playoff-settings";
import {
  parseSeasonScheduleSettings,
  serializeSeasonScheduleSettings,
} from "@/domain/schedule/season-schedule-settings";
import {
  generateRoundRobinRounds,
  pairingKey,
  roundRobinGameCount,
} from "@/domain/schedule/generate-round-robin";
import { parseWeeklyMatchupsText } from "@/domain/schedule/parse-weekly-matchups";
import { seasonAdminPath } from "@/lib/season-admin-path";
import { redirectWithFormError } from "@/server/flash-redirect";
import { newUuid } from "@/server/ids";
import { deleteCharacterGameStatsForGame } from "@/server/persist-game-stats";

export async function createTeamAction(seasonId: string, formData: FormData) {
  const user = await requireUser();
  const leagueId = await getSeasonLeagueId(seasonId);
  if (!leagueId) redirectWithFormError("/leagues", "Season not found.");
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin")
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
  const name = String(formData.get("name") ?? "").trim();
  const managerUsername = String(formData.get("managerUsername") ?? "").trim();
  const claimUsername = String(formData.get("claimUsername") ?? "").trim();
  const homeStadium = String(formData.get("homeStadium") ?? "").trim();
  if (!name)
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
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
        seasonAdminPath(leagueId, seasonId),
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
  revalidatePath(seasonAdminPath(leagueId, seasonId));
  redirect(seasonAdminPath(leagueId, seasonId, { m: "team-created" }));
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
    let managerUserId = team.managerUserId;
    let claimUsernameValue = team.claimUsername;

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
      claimUsernameValue = null;
    } else if (!team.managerUserId) {
      managerUserId = null;
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
  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(`/leagues/${leagueId}/claim`, "page");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}?m=updated`);
}

export async function updateTeamClaimUsernameAction(
  teamId: string,
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") {
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
  }

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team || team.seasonId !== seasonId) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      "Team not found.",
    );
  }
  if (team.managerUserId) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      "Cannot change reservation after a manager has claimed the team.",
    );
  }

  const claimUsername = String(formData.get("claimUsername") ?? "").trim();
  await db
    .update(teams)
    .set({ claimUsername: claimUsername || null })
    .where(eq(teams.id, teamId));

  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(`/leagues/${leagueId}/claim`, "page");
  redirect(seasonAdminPath(leagueId, seasonId, { m: "reservation-updated" }));
}

export async function savePlayoffSettingsAction(
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") {
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
  }

  const [season] = await db
    .select({ id: seasons.id, leagueId: seasons.leagueId })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  if (!season || season.leagueId !== leagueId) {
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Season not found.");
  }

  const autoQualifyCount = Number(formData.get("autoQualifyCount"));
  const playInTeamCount = Number(formData.get("playInTeamCount"));
  const playInSpots = Number(formData.get("playInSpots"));
  const playInRoundNumber = Number(formData.get("playInRoundNumber"));
  const mainBracketTeamCount = Number(formData.get("mainBracketTeamCount"));
  const playInBestOf = Number(formData.get("playInBestOf"));
  const mainRoundBestOf = Number(formData.get("mainRoundBestOf"));
  const finalsBestOf = Number(formData.get("finalsBestOf"));
  const higherSeedHomeField = formData.get("higherSeedHomeField") === "on";

  const [existing] = await db
    .select({ playoffSettings: seasons.playoffSettings })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  const current = parsePlayoffSettings(existing?.playoffSettings);
  const next = {
    ...current,
    autoQualifyCount: Number.isFinite(autoQualifyCount)
      ? autoQualifyCount
      : current.autoQualifyCount,
    playInTeamCount: Number.isFinite(playInTeamCount)
      ? playInTeamCount
      : current.playInTeamCount,
    playInSpots: Number.isFinite(playInSpots) ? playInSpots : current.playInSpots,
    playInRoundNumber: Number.isFinite(playInRoundNumber)
      ? playInRoundNumber
      : current.playInRoundNumber,
    mainBracketTeamCount: Number.isFinite(mainBracketTeamCount)
      ? mainBracketTeamCount
      : current.mainBracketTeamCount,
    playInBestOf: ([1, 3, 5, 7] as const).includes(playInBestOf as 1 | 3 | 5 | 7)
      ? (playInBestOf as 1 | 3 | 5 | 7)
      : current.playInBestOf,
    mainRoundBestOf: ([1, 3, 5, 7] as const).includes(mainRoundBestOf as 1 | 3 | 5 | 7)
      ? (mainRoundBestOf as 1 | 3 | 5 | 7)
      : current.mainRoundBestOf,
    finalsBestOf: ([1, 3, 5, 7] as const).includes(finalsBestOf as 1 | 3 | 5 | 7)
      ? (finalsBestOf as 1 | 3 | 5 | 7)
      : current.finalsBestOf,
    higherSeedHomeField,
  };

  const validated = parsePlayoffSettings(serializePlayoffSettings(next));
  await db
    .update(seasons)
    .set({ playoffSettings: serializePlayoffSettings(validated) })
    .where(eq(seasons.id, seasonId));

  revalidatePath(seasonAdminPath(leagueId, seasonId));
  revalidatePath(`/leagues/${leagueId}/standings`);
  redirect(seasonAdminPath(leagueId, seasonId, { m: "playoff-settings" }));
}

export async function saveScheduleSettingsAction(
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") {
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
  }

  const [season] = await db
    .select({ id: seasons.id, leagueId: seasons.leagueId })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  if (!season || season.leagueId !== leagueId) {
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Season not found.");
  }

  const format = String(formData.get("regularSeasonFormat") ?? "manual");
  const settings = parseSeasonScheduleSettings(null);
  const next = {
    regularSeasonFormat:
      format === "round_robin" ? ("round_robin" as const) : ("manual" as const),
  };
  const validated = parseSeasonScheduleSettings(serializeSeasonScheduleSettings(next));

  await db
    .update(seasons)
    .set({ scheduleSettings: serializeSeasonScheduleSettings(validated) })
    .where(eq(seasons.id, seasonId));

  revalidatePath(seasonAdminPath(leagueId, seasonId));
  revalidatePath(`/leagues/${leagueId}/schedule`);
  redirect(seasonAdminPath(leagueId, seasonId, { m: "schedule-settings" }));
}

async function getOrCreateRegularRound(
  seasonId: string,
  roundNumber: number,
): Promise<string> {
  const [existing] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(
      and(
        eq(rounds.seasonId, seasonId),
        eq(rounds.phase, "regular"),
        eq(rounds.roundNumber, roundNumber),
      ),
    )
    .limit(1);
  if (existing) return existing.id;

  const id = newUuid();
  await db.insert(rounds).values({
    id,
    seasonId,
    phase: "regular",
    roundNumber,
  });
  return id;
}

async function getExistingRegularPairKeys(seasonId: string): Promise<Set<string>> {
  const existingGames = await db
    .select({
      homeTeamId: scheduleGames.homeTeamId,
      awayTeamId: scheduleGames.awayTeamId,
    })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .where(and(eq(rounds.seasonId, seasonId), eq(rounds.phase, "regular")));

  return new Set(
    existingGames.map((g) => pairingKey(g.homeTeamId, g.awayTeamId)),
  );
}

async function nextSlotInRound(roundId: string): Promise<number> {
  const [maxSlot] = await db
    .select({ slot: scheduleGames.slotInRound })
    .from(scheduleGames)
    .where(eq(scheduleGames.roundId, roundId))
    .orderBy(sql`${scheduleGames.slotInRound} DESC`)
    .limit(1);
  return (maxSlot?.slot ?? 0) + 1;
}

export async function generateRoundRobinScheduleAction(
  seasonId: string,
  leagueId: string,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") {
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
  }

  const teamRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.seasonId, seasonId))
    .orderBy(asc(teams.name));

  if (teamRows.length < 2) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      "Need at least 2 teams to generate a schedule.",
    );
  }

  const teamIds = teamRows.map((t) => t.id);
  const existingPairs = await getExistingRegularPairKeys(seasonId);
  const weeklyRounds = generateRoundRobinRounds(teamIds);

  let added = 0;
  for (const week of weeklyRounds) {
    const roundId = await getOrCreateRegularRound(seasonId, week.roundNumber);
    let slot = await nextSlotInRound(roundId);

    for (const pairing of week.matchups) {
      const key = pairingKey(pairing.homeTeamId, pairing.awayTeamId);
      if (existingPairs.has(key)) continue;

      await db.insert(scheduleGames).values({
        id: newUuid(),
        roundId,
        slotInRound: slot++,
        homeTeamId: pairing.homeTeamId,
        awayTeamId: pairing.awayTeamId,
      });
      existingPairs.add(key);
      added++;
    }
  }

  if (added === 0) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      "Round robin schedule already includes every pairing.",
    );
  }

  await db
    .update(seasons)
    .set({
      scheduleSettings: serializeSeasonScheduleSettings({
        regularSeasonFormat: "round_robin",
      }),
    })
    .where(eq(seasons.id, seasonId));

  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(`/leagues/${leagueId}/schedule`);
  redirect(
    seasonAdminPath(leagueId, seasonId, { m: "round-robin", count: added }),
  );
}

export async function addWeeklyMatchupsAction(
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") {
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
  }

  const weekNumber = Number(formData.get("weekNumber") ?? 1);
  const text = String(formData.get("matchups") ?? "");

  if (!Number.isFinite(weekNumber) || weekNumber < 1) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      "Week number must be at least 1.",
    );
  }

  const teamRows = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.seasonId, seasonId))
    .orderBy(asc(teams.name));

  const teamNameToId = new Map(teamRows.map((t) => [t.name, t.id]));
  const { matchups, errors } = parseWeeklyMatchupsText(text, teamNameToId);

  if (errors.length > 0) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      errors.join(" "),
    );
  }
  if (matchups.length === 0) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      "Add at least one matchup (one per line).",
    );
  }

  const roundId = await getOrCreateRegularRound(seasonId, weekNumber);
  const existingPairs = await getExistingRegularPairKeys(seasonId);
  let slot = await nextSlotInRound(roundId);
  let added = 0;

  for (const matchup of matchups) {
    const key = pairingKey(matchup.homeTeamId, matchup.awayTeamId);
    if (existingPairs.has(key)) continue;

    await db.insert(scheduleGames).values({
      id: newUuid(),
      roundId,
      slotInRound: slot++,
      homeTeamId: matchup.homeTeamId,
      awayTeamId: matchup.awayTeamId,
    });
    existingPairs.add(key);
    added++;
  }

  if (added === 0) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      "All matchups already exist on the schedule.",
    );
  }

  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(`/leagues/${leagueId}/schedule`);
  redirect(
    seasonAdminPath(leagueId, seasonId, {
      m: "weekly-matchups",
      count: added,
      week: weekNumber,
    }),
  );
}

export async function organizeRoundRobinWeeksAction(
  seasonId: string,
  leagueId: string,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") {
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
  }

  const teamRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.seasonId, seasonId))
    .orderBy(asc(teams.name));

  if (teamRows.length < 2) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      "Need at least 2 teams.",
    );
  }

  const weeklyRounds = generateRoundRobinRounds(teamRows.map((t) => t.id));
  const pairToWeek = new Map<
    string,
    { weekNumber: number; slotInRound: number }
  >();
  for (const week of weeklyRounds) {
    week.matchups.forEach((matchup, index) => {
      pairToWeek.set(pairingKey(matchup.homeTeamId, matchup.awayTeamId), {
        weekNumber: week.roundNumber,
        slotInRound: index + 1,
      });
    });
  }

  const gameRows = await db
    .select({ game: scheduleGames })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .where(and(eq(rounds.seasonId, seasonId), eq(rounds.phase, "regular")));

  let moved = 0;
  for (const { game } of gameRows) {
    const target = pairToWeek.get(
      pairingKey(game.homeTeamId, game.awayTeamId),
    );
    if (!target) continue;

    const roundId = await getOrCreateRegularRound(seasonId, target.weekNumber);
    await db
      .update(scheduleGames)
      .set({
        roundId,
        slotInRound: target.slotInRound,
      })
      .where(eq(scheduleGames.id, game.id));
    moved++;
  }

  if (moved === 0) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      "No games could be assigned to weekly rounds.",
    );
  }

  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(`/leagues/${leagueId}/schedule`);
  redirect(
    seasonAdminPath(leagueId, seasonId, { m: "organize-weeks", count: moved }),
  );
}

export async function savePoolAction(seasonId: string, formData: FormData) {
  const user = await requireUser();
  const leagueId = (await getSeasonLeagueId(seasonId))!;
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin")
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
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
          seasonAdminPath(leagueId, seasonId),
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
          seasonAdminPath(leagueId, seasonId),
          "Cannot shrink pool: unassign roster copies above the new count first.",
        );
      }
      await db.delete(rosterInstances).where(eq(rosterInstances.id, r.id));
    }
  }
  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(seasonAdminPath(leagueId, seasonId));
  redirect(seasonAdminPath(leagueId, seasonId, { m: "pool-saved" }));
}

export async function assignRosterFormAction(formData: FormData) {
  const instanceId = String(formData.get("instanceId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const leagueId = String(formData.get("leagueId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const result = await assignRosterInstanceAction({
    instanceId,
    seasonId,
    leagueId,
    teamId: teamId || null,
  });
  if (result.error) {
    redirectWithFormError(`/leagues/${leagueId}/seasons/${seasonId}/rosters`, result.error);
  }
  redirect(`/leagues/${leagueId}/seasons/${seasonId}/rosters`);
}

export async function assignRosterInstanceAction(input: {
  instanceId: string;
  seasonId: string;
  leagueId: string;
  teamId: string | null;
}): Promise<{ error?: string }> {
  const { instanceId, seasonId, leagueId, teamId } = input;
  if (!instanceId || !seasonId || !leagueId) {
    return { error: "Missing roster fields." };
  }

  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") return { error: "Forbidden." };

  const [instance] = await db
    .select({ id: rosterInstances.id, teamId: rosterInstances.teamId })
    .from(rosterInstances)
    .where(
      and(eq(rosterInstances.id, instanceId), eq(rosterInstances.seasonId, seasonId)),
    )
    .limit(1);
  if (!instance) return { error: "Character copy not found." };

  if (instance.teamId && instance.teamId !== teamId) {
    const currentCount = await countTeamRosterInstances(instance.teamId);
    if (currentCount - 1 < MIN_TEAM_ROSTER_SIZE) {
      const [team] = await db
        .select({ name: teams.name })
        .from(teams)
        .where(eq(teams.id, instance.teamId))
        .limit(1);
      return { error: minimumRosterError(team?.name) };
    }
  }

  if (teamId) {
    const [team] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.seasonId, seasonId)))
      .limit(1);
    if (!team) return { error: "Team not found." };
  }

  await db
    .update(rosterInstances)
    .set({ teamId })
    .where(eq(rosterInstances.id, instanceId));

  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}/rosters`);
  return {};
}

export async function createRoundAction(
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin")
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
  const phase = String(formData.get("phase") ?? "regular") as "regular" | "playoffs";
  const roundNumber = Number(formData.get("roundNumber") ?? 1);
  if (!Number.isFinite(roundNumber) || roundNumber < 1)
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Invalid round number.");
  await db
    .insert(rounds)
    .values({ id: newUuid(), seasonId, phase, roundNumber })
    .onConflictDoNothing({
      target: [rounds.seasonId, rounds.phase, rounds.roundNumber],
    });
  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(seasonAdminPath(leagueId, seasonId));
  redirect(seasonAdminPath(leagueId, seasonId, { m: "round-created" }));
}

export async function addScheduleGameAction(
  seasonId: string,
  leagueId: string,
  formData: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin")
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
  const roundId = String(formData.get("roundId") ?? "");
  const slot = Number(formData.get("slot") ?? 1);
  const homeTeamId = String(formData.get("homeTeamId") ?? "");
  const awayTeamId = String(formData.get("awayTeamId") ?? "");
  if (!roundId || !homeTeamId || !awayTeamId)
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
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
  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(seasonAdminPath(leagueId, seasonId));
  redirect(seasonAdminPath(leagueId, seasonId, { m: "game-added" }));
}

export async function saveYoutubeFormAction(formData: FormData) {
  const gameId = String(formData.get("gameId") ?? "");
  const leagueId = String(formData.get("leagueId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const url = String(formData.get("youtube") ?? "");
  if (!gameId || !leagueId || !seasonId) return;
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (!role) {
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}`,
      "Forbidden.",
    );
  }

  const [game] = await db
    .select()
    .from(scheduleGames)
    .where(eq(scheduleGames.id, gameId))
    .limit(1);
  if (!game) {
    redirectWithFormError(
      seasonAdminPath(leagueId, seasonId),
      "Game not found.",
    );
  }

  const [home] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, game.homeTeamId))
    .limit(1);
  const [away] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, game.awayTeamId))
    .limit(1);
  if (!home || !away) {
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}`,
      "Teams missing.",
    );
  }

  if (
    !canUserReportGame(
      user.id,
      role,
      home.managerUserId,
      away.managerUserId,
    )
  ) {
    redirectWithFormError(
      `/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}`,
      "Only league admins or managers in this game can add a video link.",
    );
  }

  await db
    .update(scheduleGames)
    .set({ youtubeUrl: url.trim() || null })
    .where(eq(scheduleGames.id, gameId));
  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}`);
  revalidatePath(`/leagues/${leagueId}/schedule`);
  redirect(
    `/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}?m=video-saved`,
  );
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
    redirectWithFormError(seasonAdminPath(leagueId, seasonId), "Forbidden.");
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
  revalidatePath(seasonAdminPath(leagueId, seasonId), "layout");
  revalidatePath(seasonAdminPath(leagueId, seasonId));
  redirect(seasonAdminPath(leagueId, seasonId, { m: "stats-cleared" }));
}
