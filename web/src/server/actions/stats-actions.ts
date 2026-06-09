"use server";

import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { characters, rosterInstances, scheduleGames, teams, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { canUserReportGame } from "@/lib/game-report-access";
import { gameIdLinkError, netplayParticipantError } from "@/lib/upload-participant";
import { parseDecodedGameFile } from "@/domain/stats/decode-game-file";
import { matchNetplayTeams } from "@/domain/stats/match-netplay-teams";
import { parseCharacterGameStats } from "@/domain/stats/parse-character-game-stats";
import { charIdsForSide } from "@/domain/stats/roster-team-match";
import { recordSeasonEvent } from "@/lib/season-events";
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
  const gameIdError = gameIdLinkError(
    parsed.statsGameId,
    gameId,
    existing?.id,
  );
  if (gameIdError) return { error: gameIdError };

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

  const participantError = netplayParticipantError(
    user,
    role,
    parsed.awayPlayer,
    parsed.homePlayer,
  );
  if (participantError) return { error: participantError };

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

  let rosterContext;
  try {
    const characterStats = parseCharacterGameStats(JSON.parse(jsonText) as unknown);
    const rosterRows = await db
      .select({
        teamId: rosterInstances.teamId,
        gameCharId: characters.gameCharId,
      })
      .from(rosterInstances)
      .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
      .where(
        and(
          eq(rosterInstances.seasonId, seasonId),
          isNotNull(rosterInstances.teamId),
          inArray(rosterInstances.teamId, [home.id, away.id]),
        ),
      );

    const charIdsByTeam = new Map<string, string[]>();
    for (const teamId of [home.id, away.id]) {
      charIdsByTeam.set(teamId, []);
    }
    for (const row of rosterRows) {
      if (!row.teamId) continue;
      charIdsByTeam.get(row.teamId)?.push(row.gameCharId);
    }

    rosterContext = {
      awayCharIds: charIdsForSide(characterStats.characterStats, "Away"),
      homeCharIds: charIdsForSide(characterStats.characterStats, "Home"),
      teamRosters: [home.id, away.id].map((teamId) => ({
        teamId,
        charIds: charIdsByTeam.get(teamId) ?? [],
      })),
    };
  } catch {
    rosterContext = undefined;
  }

  const match = matchNetplayTeams(
    parsed,
    {
      teamId: home.id,
      teamName: home.name,
      manager: hm,
    },
    {
      teamId: away.id,
      teamName: away.name,
      manager: am,
    },
    rosterContext,
  );
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

  const awayName = away.name;
  const homeName = home.name;
  await recordSeasonEvent({
    seasonId,
    eventType: "game_uploaded",
    message: `Game reported: ${parsed.awayPlayer} (${match.scheduleAwayScore}) @ ${parsed.homePlayer} (${match.scheduleHomeScore}) — ${awayName} vs ${homeName}`,
    relatedGameId: gameId,
  });

  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}`);
  revalidatePath(`/leagues/${leagueId}/schedule`);
  revalidatePath(`/leagues/${leagueId}/playoffs`);
  revalidatePath(`/leagues/${leagueId}/stadiums`);
  const out: { ok: true; warnings?: string[] } = { ok: true };
  if (match.warnings.length) out.warnings = match.warnings;
  return out;
}

export type BatchUploadFileResult = {
  fileName: string;
  ok: boolean;
  error?: string;
  gameLabel?: string;
};

export type BatchUploadState =
  | { ok: true; results: BatchUploadFileResult[] }
  | { error: string; results?: BatchUploadFileResult[] }
  | null;

export async function uploadStatsBatchAction(
  _prev: BatchUploadState,
  formData: FormData,
): Promise<BatchUploadState> {
  const leagueId = String(formData.get("leagueId") ?? "");
  const seasonId = String(formData.get("seasonId") ?? "");
  const payload = String(formData.get("batchPayload") ?? "");
  if (!leagueId || !seasonId || !payload) {
    return { error: "Missing batch upload context." };
  }

  let files: { fileName: string; jsonText: string }[];
  try {
    files = JSON.parse(payload) as { fileName: string; jsonText: string }[];
  } catch {
    return { error: "Invalid batch payload." };
  }

  if (files.length === 0) return { error: "No files selected." };
  if (files.length > 20) return { error: "Maximum 20 files per batch." };

  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (!role) return { error: "Forbidden" };

  const { findGameForStatsFile } = await import("@/lib/manager-upload-games");
  const { parseDecodedGameFile } = await import("@/domain/stats/decode-game-file");

  const results: BatchUploadFileResult[] = [];
  for (const file of files) {
    let parsed;
    try {
      parsed = parseDecodedGameFile(file.jsonText);
    } catch (e) {
      results.push({
        fileName: file.fileName,
        ok: false,
        error: e instanceof Error ? e.message : "Parse error",
      });
      continue;
    }

    const match = await findGameForStatsFile(user, role, leagueId, seasonId, parsed);
    if ("error" in match) {
      results.push({ fileName: file.fileName, ok: false, error: match.error });
      continue;
    }

    const upload = await uploadStatsAction(
      match.gameId,
      leagueId,
      seasonId,
      file.jsonText,
    );
    if (upload && "error" in upload) {
      results.push({
        fileName: file.fileName,
        ok: false,
        error: upload.error,
      });
      continue;
    }

    results.push({
      fileName: file.fileName,
      ok: true,
      gameLabel: `${parsed.awayPlayer} @ ${parsed.homePlayer}`,
    });
  }

  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  revalidatePath("/account");
  return { ok: true, results };
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
  revalidatePath(`/leagues/${leagueId}/stadiums`);
  return { ok: true, count };
}
