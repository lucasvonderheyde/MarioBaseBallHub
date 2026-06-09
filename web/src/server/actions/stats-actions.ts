"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { scheduleGames, teams, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { canUserReportGame } from "@/lib/game-report-access";
import { parseDecodedGameFile } from "@/domain/stats/decode-game-file";
import { matchNetplayTeams } from "@/domain/stats/match-netplay-teams";
import {
  persistCharacterGameStats,
  backfillCharacterGameStats,
  deleteCharacterGameStatsForGame,
} from "@/server/persist-game-stats";

export type UploadStatsState =
  | { ok: true; warnings?: string[] }
  | { error: string; warnings?: string[] }
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

  if (
    !canUserReportGame(
      user.id,
      role,
      home.managerUserId,
      away.managerUserId,
    )
  ) {
    return { error: "Only league admins or managers in this game can upload stats." };
  }

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
  const match = matchNetplayTeams(parsed, {
    teamId: home.id,
    teamName: home.name,
    manager: hm,
  }, {
    teamId: away.id,
    teamName: away.name,
    manager: am,
  });
  if (match.blockingError) {
    return { error: match.blockingError, warnings: match.warnings };
  }

  await db
    .update(scheduleGames)
    .set({
      homeScore: match.scheduleHomeScore,
      awayScore: match.scheduleAwayScore,
      statsGameId: parsed.statsGameId,
      statsRawJson: parsed.rawJson,
      statsStadiumId: parsed.stadiumId ?? null,
      playedAt: new Date(),
    })
    .where(eq(scheduleGames.id, gameId));

  await persistCharacterGameStats({
    gameId,
    seasonId,
    awaySideTeamId: match.awaySideTeamId,
    homeSideTeamId: match.homeSideTeamId,
    rawJson: parsed.rawJson,
  });
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}`);
  revalidatePath(`/leagues/${leagueId}/schedule`);
  revalidatePath(`/leagues/${leagueId}/playoffs`);
  const out: { ok: true; warnings?: string[] } = { ok: true };
  if (match.warnings.length) out.warnings = match.warnings;
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
