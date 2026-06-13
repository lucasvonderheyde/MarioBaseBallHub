"use server";

import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { backupLiveDatabase, db } from "@/db";
import { characters, rosterInstances, scheduleGames, teams, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { canUserReportGame } from "@/lib/game-report-access";
import {
  duplicateStatsGameIdMessage,
  findStoredStatsGameId,
  persistPersonalGameStats,
} from "@/lib/personal-game-stats";
import {
  gameIdLinkError,
  isUserNetplayParticipantInFile,
  netplayParticipantError,
  resolveUserTeamSide,
} from "@/lib/upload-participant";
import { parseDecodedGameFile } from "@/domain/stats/decode-game-file";
import { matchNetplayTeams } from "@/domain/stats/match-netplay-teams";
import { parseCharacterGameStats } from "@/domain/stats/parse-character-game-stats";
import { charIdsForSide } from "@/domain/stats/roster-team-match";
import { postDiscordMessage } from "@/lib/discord";
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
  const stored = await findStoredStatsGameId(parsed.statsGameId);
  if (stored.source === "personal") {
    return { error: duplicateStatsGameIdMessage(stored) };
  }
  const gameIdError = gameIdLinkError(
    parsed.statsGameId,
    gameId,
    stored.source === "schedule" ? stored.scheduleGameId : undefined,
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

  await backupLiveDatabase("pre-upload-stats");

  await db
    .update(scheduleGames)
    .set({
      homeScore: match.scheduleHomeScore,
      awayScore: match.scheduleAwayScore,
      statsGameId: parsed.statsGameId,
      statsRawJson: parsed.rawJson,
      statsStadiumId: parsed.stadiumId ?? null,
      statsAwayTeamId: match.awaySideTeamId,
      statsHomeTeamId: match.homeSideTeamId,
      statsAwayPlayer: parsed.awayPlayer,
      statsHomePlayer: parsed.homePlayer,
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

  const { maybeAutoDraftGameRecap, maybeAutoDraftSeriesRecap } = await import("@/lib/inky-service");
  void maybeAutoDraftGameRecap({ leagueId, seasonId, gameId }).catch((error) => {
    console.error("Inky auto-draft failed", error);
  });
  void maybeAutoDraftSeriesRecap({ leagueId, seasonId, gameId }).catch((error) => {
    console.error("Inky series auto-draft failed", error);
  });

  const fieldAwayName =
    match.awaySideTeamId === away.id ? away.name : home.name;
  const fieldHomeName =
    match.homeSideTeamId === home.id ? home.name : away.name;
  await recordSeasonEvent({
    seasonId,
    eventType: "game_uploaded",
    message: `Game reported: ${parsed.awayPlayer} (${parsed.awayScore}) @ ${parsed.homePlayer} (${parsed.homeScore}) — ${fieldAwayName} vs ${fieldHomeName}`,
    relatedGameId: gameId,
  });
  await postDiscordMessage(
    `⚾ **Game reported** — ${fieldAwayName} ${parsed.awayScore} @ ${fieldHomeName} ${parsed.homeScore} (${parsed.awayPlayer} vs ${parsed.homePlayer})`,
  );

  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}`);
  revalidatePath(`/leagues/${leagueId}/schedule`);
  revalidatePath(`/leagues/${leagueId}/standings`);
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
  const payload = String(formData.get("batchPayload") ?? "");
  if (!payload) {
    return { error: "Missing batch upload payload." };
  }

  let files: { fileName: string; jsonText: string }[];
  try {
    files = JSON.parse(payload) as { fileName: string; jsonText: string }[];
  } catch {
    return { error: "Invalid batch payload." };
  }

  if (files.length === 0) return { error: "No files selected." };
  if (files.length > 50) return { error: "Maximum 50 files per batch." };

  const user = await requireUser();

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

    if (!isUserNetplayParticipantInFile(user, parsed.awayPlayer, parsed.homePlayer)) {
      results.push({
        fileName: file.fileName,
        ok: false,
        error:
          "Your netplay username must match Home Player or Away Player in this file.",
      });
      continue;
    }

    const teamSide = resolveUserTeamSide(user, parsed.awayPlayer, parsed.homePlayer);
    if (!teamSide) {
      results.push({
        fileName: file.fileName,
        ok: false,
        error: "Could not determine which side you played in this file.",
      });
      continue;
    }

    const stored = await findStoredStatsGameId(parsed.statsGameId);
    if (stored.source !== "none") {
      results.push({
        fileName: file.fileName,
        ok: false,
        error: duplicateStatsGameIdMessage(stored),
      });
      continue;
    }

    try {
      await persistPersonalGameStats({
        managerUserId: user.id,
        uploadedByUserId: user.id,
        teamSide,
        parsed,
      });
    } catch (e) {
      results.push({
        fileName: file.fileName,
        ok: false,
        error: e instanceof Error ? e.message : "Could not save game.",
      });
      continue;
    }

    results.push({
      fileName: file.fileName,
      ok: true,
      gameLabel: `${parsed.awayPlayer} @ ${parsed.homePlayer}`,
    });
  }

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
  await backupLiveDatabase(`pre-backfill-stats-${seasonId.slice(0, 8)}`);
  const count = await backfillCharacterGameStats(seasonId);
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`, "layout");
  revalidatePath(`/leagues/${leagueId}/stadiums`);
  return { ok: true, count };
}
