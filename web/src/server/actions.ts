"use server";

import crypto from "crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  characters,
  leagueMembers,
  leagues,
  rosterInstances,
  rounds,
  scheduleGames,
  seasonCharacterPool,
  seasons,
  teams,
  users,
} from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireUser } from "@/lib/auth";
import { getSeasonLeagueId, getLeagueRole } from "@/lib/league-access";
import { parseDecodedStatsJson } from "@/lib/stats-parser";
import {
  DEFAULT_TIEBREAKER_ORDER,
  serializeTiebreakerOrder,
} from "@/lib/tiebreakers";

function rid() {
  return crypto.randomUUID();
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function flash(path: string, msg: string) {
  redirect(`${path}?e=${encodeURIComponent(msg)}`);
}

export async function registerAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (username.length < 2 || password.length < 6) {
    flash("/register", "Username (2+) and password (6+) required.");
  }
  const hash = await bcrypt.hash(password, 10);
  const id = rid();
  try {
    await db.insert(users).values({
      id,
      username,
      passwordHash: hash,
      displayName: displayName || null,
    });
  } catch {
    flash("/register", "Username already taken.");
  }
  const session = await getSession();
  session.userId = id;
  await session.save();
  redirect("/leagues");
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
    flash("/login", "Invalid credentials.");
  }
  const session = await getSession();
  session.userId = u.id;
  await session.save();
  redirect("/leagues");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

export async function createLeagueAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) flash("/leagues", "League name required.");
  const id = rid();
  const slug = `${slugify(name) || "league"}-${id.slice(0, 8)}`;
  await db.insert(leagues).values({ id, name, slug });
  await db.insert(leagueMembers).values({
    leagueId: id,
    userId: user.id,
    role: "admin",
  });
  revalidatePath("/leagues");
  redirect(`/leagues/${id}`);
}

export async function createSeasonAction(leagueId: string, formData: FormData) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user.id);
  if (role !== "admin") flash(`/leagues/${leagueId}`, "Forbidden.");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) flash(`/leagues/${leagueId}`, "Season name required.");
  const id = rid();
  await db.insert(seasons).values({
    id,
    leagueId,
    name,
    status: "setup",
    tiebreakerOrder: serializeTiebreakerOrder([...DEFAULT_TIEBREAKER_ORDER]),
  });
  revalidatePath(`/leagues/${leagueId}`);
  redirect(`/leagues/${leagueId}/seasons/${id}`);
}

export async function addMemberAction(leagueId: string, formData: FormData) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user.id);
  if (role !== "admin") flash(`/leagues/${leagueId}`, "Forbidden.");
  const username = String(formData.get("username") ?? "").trim();
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!target)
    flash(
      `/leagues/${leagueId}`,
      "User not found. They must register first.",
    );
  await db
    .insert(leagueMembers)
    .values({ leagueId, userId: target.id, role: "manager" })
    .onConflictDoNothing();
  revalidatePath(`/leagues/${leagueId}`);
  redirect(`/leagues/${leagueId}?m=member`);
}

export async function createTeamAction(seasonId: string, formData: FormData) {
  const user = await requireUser();
  const leagueId = await getSeasonLeagueId(seasonId);
  if (!leagueId) flash("/leagues", "Season not found.");
  const role = await getLeagueRole(leagueId, user.id);
  if (role !== "admin")
    flash(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  const name = String(formData.get("name") ?? "").trim();
  const managerUsername = String(formData.get("managerUsername") ?? "").trim();
  const homeStadium = String(formData.get("homeStadium") ?? "").trim();
  if (!name)
    flash(`/leagues/${leagueId}/seasons/${seasonId}`, "Team name required.");
  let managerUserId: string | null = null;
  if (managerUsername) {
    const [m] = await db
      .select()
      .from(users)
      .where(eq(users.username, managerUsername))
      .limit(1);
    if (!m)
      flash(
        `/leagues/${leagueId}/seasons/${seasonId}`,
        "Manager username not found.",
      );
    managerUserId = m.id;
  }
  await db.insert(teams).values({
    id: rid(),
    seasonId,
    name,
    managerUserId,
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
  const role = await getLeagueRole(leagueId, user.id);
  if (role !== "admin")
    flash(
      `/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}`,
      "Forbidden.",
    );
  const name = String(formData.get("name") ?? "").trim();
  const managerUsername = String(formData.get("managerUsername") ?? "").trim();
  const homeStadium = String(formData.get("homeStadium") ?? "").trim();
  let managerUserId: string | null = null;
  if (managerUsername) {
    const [m] = await db
      .select()
      .from(users)
      .where(eq(users.username, managerUsername))
      .limit(1);
    if (!m)
      flash(
        `/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}`,
        "Manager username not found.",
      );
    managerUserId = m.id;
  } else {
    managerUserId = null;
  }
  await db
    .update(teams)
    .set({
      name: name || undefined,
      managerUserId,
      homeStadiumGameId: homeStadium || null,
    })
    .where(eq(teams.id, teamId));
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}/teams/${teamId}`);
}

export async function savePoolAction(seasonId: string, formData: FormData) {
  const user = await requireUser();
  const leagueId = (await getSeasonLeagueId(seasonId))!;
  const role = await getLeagueRole(leagueId, user.id);
  if (role !== "admin")
    flash(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
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
        flash(
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
          id: rid(),
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
        flash(
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
    flash(`/leagues`, "Missing roster fields.");
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user.id);
  if (role !== "admin")
    flash(`/leagues/${leagueId}/seasons/${seasonId}/rosters`, "Forbidden.");
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
  const role = await getLeagueRole(leagueId, user.id);
  if (role !== "admin")
    flash(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  const phase = String(formData.get("phase") ?? "regular") as "regular" | "playoffs";
  const roundNumber = Number(formData.get("roundNumber") ?? 1);
  if (!Number.isFinite(roundNumber) || roundNumber < 1)
    flash(`/leagues/${leagueId}/seasons/${seasonId}`, "Invalid round number.");
  await db
    .insert(rounds)
    .values({ id: rid(), seasonId, phase, roundNumber })
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
  const role = await getLeagueRole(leagueId, user.id);
  if (role !== "admin")
    flash(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  const roundId = String(formData.get("roundId") ?? "");
  const slot = Number(formData.get("slot") ?? 1);
  const homeTeamId = String(formData.get("homeTeamId") ?? "");
  const awayTeamId = String(formData.get("awayTeamId") ?? "");
  if (!roundId || !homeTeamId || !awayTeamId)
    flash(`/leagues/${leagueId}/seasons/${seasonId}`, "Round and teams required.");
  await db
    .insert(scheduleGames)
    .values({
      id: rid(),
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
  const role = await getLeagueRole(leagueId, user.id);
  if (!role) flash(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  await db
    .update(scheduleGames)
    .set({ youtubeUrl: url.trim() || null })
    .where(eq(scheduleGames.id, gameId));
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}`);
}

export type UploadStatsState =
  | { ok: true; warnings?: string[] }
  | { error: string }
  | null;

export async function uploadStatsFormAction(
  _prev: UploadStatsState,
  formData: FormData,
): Promise<UploadStatsState> {
  const gameId = String(formData.get("gameId") ?? "");
  const leagueId = String(formData.get("leagueId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const jsonText = String(formData.get("json") ?? "");
  if (!gameId || !leagueId || !seasonId)
    return { error: "Missing game context." };
  return uploadStatsAction(gameId, leagueId, seasonId, jsonText);
}

export async function uploadStatsAction(
  gameId: string,
  leagueId: string,
  seasonId: string,
  jsonText: string,
): Promise<UploadStatsState> {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user.id);
  if (!role) return { error: "Forbidden" };
  let parsed;
  try {
    parsed = parseDecodedStatsJson(jsonText);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Parse error" };
  }
  const [existing] = await db
    .select({ id: scheduleGames.id })
    .from(scheduleGames)
    .where(eq(scheduleGames.statsGameId, parsed.statsGameId))
    .limit(1);
  if (existing && existing.id !== gameId) {
    return { error: "This stats file (GameID) is already linked to another game." };
  }
  const [game] = await db
    .select()
    .from(scheduleGames)
    .where(eq(scheduleGames.id, gameId))
    .limit(1);
  if (!game) return { error: "Game not found" };
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
  if (!home || !away) return { error: "Teams missing" };
  const [hm] = home.managerUserId
    ? await db
        .select()
        .from(users)
        .where(eq(users.id, home.managerUserId))
        .limit(1)
    : [null];
  const [am] = away.managerUserId
    ? await db
        .select()
        .from(users)
        .where(eq(users.id, away.managerUserId))
        .limit(1)
    : [null];
  const warnings: string[] = [];
  const norm = (s: string | null | undefined) =>
    (s ?? "").trim().toLowerCase();
  if (hm?.displayName && norm(hm.displayName) !== norm(parsed.homePlayer)) {
    warnings.push(
      `Home netplay name mismatch: schedule manager "${hm.displayName}" vs file "${parsed.homePlayer}".`,
    );
  }
  if (am?.displayName && norm(am.displayName) !== norm(parsed.awayPlayer)) {
    warnings.push(
      `Away netplay name mismatch: schedule manager "${am.displayName}" vs file "${parsed.awayPlayer}".`,
    );
  }
  await db
    .update(scheduleGames)
    .set({
      homeScore: parsed.homeScore,
      awayScore: parsed.awayScore,
      statsGameId: parsed.statsGameId,
      statsRawJson: parsed.rawJson,
      playedAt: new Date(),
    })
    .where(eq(scheduleGames.id, gameId));
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`);
  const out: { ok: true; warnings?: string[] } = { ok: true };
  if (warnings.length) out.warnings = warnings;
  return out;
}

export async function clearGameStatsAction(
  gameId: string,
  leagueId: string,
  seasonId: string,
  _formData?: FormData,
) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user.id);
  if (role !== "admin")
    flash(`/leagues/${leagueId}/seasons/${seasonId}`, "Forbidden.");
  await db
    .update(scheduleGames)
    .set({
      homeScore: null,
      awayScore: null,
      statsGameId: null,
      statsRawJson: null,
      playedAt: null,
    })
    .where(eq(scheduleGames.id, gameId));
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  redirect(`/leagues/${leagueId}/seasons/${seasonId}`);
}
