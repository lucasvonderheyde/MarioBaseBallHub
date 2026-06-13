import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leaguePosts } from "@/db/schema";
import type { InkyPostType } from "@/domain/inky/post-types";
import {
  inkyPressBoxFromGameRecap,
  INKY_BYLINE,
} from "@/domain/inky/inky-persona";
import { postDiscordMessage } from "@/lib/discord";
import {
  generateInkyGameRecap,
  inkyEnabled,
} from "@/lib/inky-generate";

export type InkyDraftPostInput = {
  leagueId: string;
  seasonId: string;
  postType: InkyPostType;
  title: string;
  body: string;
  createdByUserId?: string | null;
  relatedGameId?: string | null;
  seriesKey?: string | null;
  weekNumber?: number | null;
};

export async function findExistingInkyDraft(input: {
  seasonId: string;
  postType: InkyPostType;
  relatedGameId?: string | null;
  seriesKey?: string | null;
  weekNumber?: number | null;
}) {
  const rows = await db
    .select()
    .from(leaguePosts)
    .where(
      and(
        eq(leaguePosts.seasonId, input.seasonId),
        eq(leaguePosts.postType, input.postType),
        eq(leaguePosts.status, "draft"),
      ),
    );

  return rows.find((row) => {
    if (input.relatedGameId && row.relatedGameId === input.relatedGameId) return true;
    if (input.seriesKey && row.seriesKey === input.seriesKey) return true;
    if (
      input.weekNumber != null &&
      row.weekNumber === input.weekNumber &&
      input.postType === "weekly"
    ) {
      return true;
    }
    return false;
  });
}

export async function createInkyDraftPost(input: InkyDraftPostInput): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(leaguePosts).values({
    id,
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    postType: input.postType,
    relatedGameId: input.relatedGameId ?? null,
    seriesKey: input.seriesKey ?? null,
    weekNumber: input.weekNumber ?? null,
    title: input.title,
    body: input.body,
    source: "ai",
    status: "draft",
    createdByUserId: input.createdByUserId ?? null,
    createdAt: new Date(),
  });
  return id;
}

export function inkyAutoDraftGameEnabled(): boolean {
  return process.env.INKY_AUTO_DRAFT_GAME === "1" || process.env.INKY_AUTO_DRAFT_GAME === "true";
}

/** Creates a commissioner-review draft after stats upload when enabled. */
export async function maybeAutoDraftGameRecap(input: {
  leagueId: string;
  seasonId: string;
  gameId: string;
}): Promise<void> {
  if (!inkyEnabled() || !inkyAutoDraftGameEnabled()) return;

  const existing = await findExistingInkyDraft({
    seasonId: input.seasonId,
    postType: "game_recap",
    relatedGameId: input.gameId,
  });
  if (existing) return;

  const recap = await generateInkyGameRecap(input.seasonId, input.gameId);
  if ("error" in recap) {
    console.error("maybeAutoDraftGameRecap failed", recap.error);
    return;
  }

  await createInkyDraftPost({
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    postType: "game_recap",
    title: recap.title,
    body: recap.body,
    relatedGameId: input.gameId,
  });

  revalidatePath(`/leagues/${input.leagueId}/seasons/${input.seasonId}`);
  revalidatePath(
    `/leagues/${input.leagueId}/seasons/${input.seasonId}/games/${input.gameId}`,
  );
}

export async function postInkyArticleToDiscord(input: {
  postType: InkyPostType;
  title: string;
  body: string;
  leagueId: string;
  seasonId: string;
}): Promise<void> {
  if (input.postType === "game_recap") {
    await postDiscordMessage(inkyPressBoxFromGameRecap(input.title, input.body));
    return;
  }

  const excerpt = input.body.split(/\n\n+/)[0]?.trim() ?? input.body.slice(0, 400);
  const headline = input.title.toUpperCase();
  await postDiscordMessage(
    `🦑 **MORNING STAR — ${headline}**\n\n${excerpt.slice(0, 500)}\n\n— ${INKY_BYLINE}`,
  );
}
