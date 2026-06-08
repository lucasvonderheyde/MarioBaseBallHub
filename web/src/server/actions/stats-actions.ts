"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { scheduleGames, teams, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { parseDecodedGameFile } from "@/domain/stats/decode-game-file";
import { netplayLabelWarnings } from "@/domain/stats/netplay-warnings";
import {
  persistCharacterGameStats,
  backfillCharacterGameStats,
  deleteCharacterGameStatsForGame,
} from "@/server/persist-game-stats";

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
  const role = await getLeagueRole(leagueId, user);
  if (!role) return { error: "Forbidden" };
  let parsed;
  try {
    parsed = parseDecodedGameFile(jsonText);
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
  const warnings = netplayLabelWarnings(parsed, hm?.displayName, am?.displayName);
  await db
    .update(scheduleGames)
    .set({
      homeScore: parsed.homeScore,
      awayScore: parsed.awayScore,
      statsGameId: parsed.statsGameId,
      statsRawJson: parsed.rawJson,
      statsStadiumId: parsed.stadiumId ?? null,
      playedAt: new Date(),
    })
    .where(eq(scheduleGames.id, gameId));

  await persistCharacterGameStats({
    gameId,
    seasonId,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    rawJson: parsed.rawJson,
  });
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  const out: { ok: true; warnings?: string[] } = { ok: true };
  if (warnings.length) out.warnings = warnings;
  return out;
}

export async function backfillStatsAction(
  seasonId: string,
  leagueId: string,
): Promise<{ ok: true; count: number } | { error: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") return { error: "Forbidden" };
  const count = await backfillCharacterGameStats(seasonId);
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  return { ok: true, count };
}
