"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leaguePosts } from "@/db/schema";
import type { InkyPostType } from "@/domain/inky/post-types";
import { isInkyPostType } from "@/domain/inky/post-types";
import {
  generateInkyDraftRecap,
  generateInkyGameRecap,
  generateInkyPreview,
  generateInkySeasonRecap,
  generateInkySeriesRecap,
  generateInkyWeeklyColumn,
  inkyEnabled,
} from "@/lib/inky-generate";
import {
  createInkyDraftPost,
  findExistingInkyDraft,
  postInkyArticleToDiscord,
} from "@/lib/inky-service";
import { leaguePostPageHref } from "@/lib/league-news-links";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";

function revalidateNewsPaths(leagueId: string, seasonId: string) {
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`);
}

function revalidatePostPaths(
  leagueId: string,
  seasonId: string,
  postId: string,
  relatedGameId?: string | null,
) {
  revalidatePath(leaguePostPageHref(leagueId, seasonId, postId));
  revalidateGameRecapPath(leagueId, seasonId, relatedGameId);
}

function revalidateGameRecapPath(
  leagueId: string,
  seasonId: string,
  gameId: string | null | undefined,
) {
  if (!gameId) return;
  revalidatePath(
    `/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}`,
  );
}

async function requireCommissioner(leagueId: string) {
  const user = await requireUser();
  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") return { error: "Only commissioners can manage Inky's desk." as const };
  return { user };
}

export async function generateSeasonRecapAction(input: {
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const auth = await requireCommissioner(input.leagueId);
  if ("error" in auth) return auth;

  const recap = await generateInkySeasonRecap(input.seasonId);
  if ("error" in recap) return { error: recap.error };

  const postId = await createInkyDraftPost({
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    postType: "season_recap",
    title: recap.title,
    body: recap.body,
    briefJson: recap.brief,
    createdByUserId: auth.user.id,
  });

  revalidateNewsPaths(input.leagueId, input.seasonId);
  revalidatePostPaths(input.leagueId, input.seasonId, postId);
  return {};
}

export async function generateInkyGameRecapAction(input: {
  leagueId: string;
  seasonId: string;
  gameId: string;
}): Promise<{ error?: string }> {
  const auth = await requireCommissioner(input.leagueId);
  if ("error" in auth) return auth;

  const recap = await generateInkyGameRecap(input.seasonId, input.gameId);
  if ("error" in recap) return { error: recap.error };

  const postId = await createInkyDraftPost({
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    postType: "game_recap",
    title: recap.title,
    body: recap.body,
    briefJson: recap.brief,
    relatedGameId: input.gameId,
    createdByUserId: auth.user.id,
  });

  revalidateNewsPaths(input.leagueId, input.seasonId);
  revalidatePostPaths(input.leagueId, input.seasonId, postId, input.gameId);
  return {};
}

export async function generateInkyWeeklyAction(input: {
  leagueId: string;
  seasonId: string;
  weekNumber?: number;
}): Promise<{ error?: string }> {
  const auth = await requireCommissioner(input.leagueId);
  if ("error" in auth) return auth;

  const recap = await generateInkyWeeklyColumn(input.seasonId, input.weekNumber);
  if ("error" in recap) return { error: recap.error };

  const postId = await createInkyDraftPost({
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    postType: "weekly",
    title: recap.title,
    body: recap.body,
    briefJson: recap.brief,
    weekNumber: recap.weekNumber,
    createdByUserId: auth.user.id,
  });

  revalidateNewsPaths(input.leagueId, input.seasonId);
  revalidatePostPaths(input.leagueId, input.seasonId, postId);
  return {};
}

export async function generateInkySeriesRecapAction(input: {
  leagueId: string;
  seasonId: string;
  seriesKey: string;
}): Promise<{ error?: string }> {
  const auth = await requireCommissioner(input.leagueId);
  if ("error" in auth) return auth;

  const recap = await generateInkySeriesRecap(input.seasonId, input.seriesKey);
  if ("error" in recap) return { error: recap.error };

  const postId = await createInkyDraftPost({
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    postType: "series_recap",
    title: recap.title,
    body: recap.body,
    briefJson: recap.brief,
    seriesKey: input.seriesKey,
    createdByUserId: auth.user.id,
  });

  revalidateNewsPaths(input.leagueId, input.seasonId);
  revalidatePostPaths(input.leagueId, input.seasonId, postId);
  return {};
}

export async function generateInkyPreviewAction(input: {
  leagueId: string;
  seasonId: string;
  gameId: string;
}): Promise<{ error?: string }> {
  const auth = await requireCommissioner(input.leagueId);
  if ("error" in auth) return auth;

  const recap = await generateInkyPreview(input.seasonId, input.gameId);
  if ("error" in recap) return { error: recap.error };

  const postId = await createInkyDraftPost({
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    postType: "preview",
    title: recap.title,
    body: recap.body,
    briefJson: recap.brief,
    relatedGameId: input.gameId,
    createdByUserId: auth.user.id,
  });

  revalidateNewsPaths(input.leagueId, input.seasonId);
  revalidatePostPaths(input.leagueId, input.seasonId, postId, input.gameId);
  return {};
}

export async function generateInkyDraftRecapAction(input: {
  leagueId: string;
  seasonId: string;
  variant: "lottery" | "complete";
}): Promise<{ error?: string }> {
  const auth = await requireCommissioner(input.leagueId);
  if ("error" in auth) return auth;

  const recap = await generateInkyDraftRecap(input.seasonId, input.variant);
  if ("error" in recap) return { error: recap.error };

  const postId = await createInkyDraftPost({
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    postType: "draft_recap",
    title: recap.title,
    body: recap.body,
    briefJson: recap.brief,
    createdByUserId: auth.user.id,
  });

  revalidateNewsPaths(input.leagueId, input.seasonId);
  revalidatePostPaths(input.leagueId, input.seasonId, postId);
  return {};
}

export async function publishLeaguePostAction(input: {
  postId: string;
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const auth = await requireCommissioner(input.leagueId);
  if ("error" in auth) return auth;

  const [post] = await db
    .select()
    .from(leaguePosts)
    .where(
      and(eq(leaguePosts.id, input.postId), eq(leaguePosts.leagueId, input.leagueId)),
    )
    .limit(1);
  if (!post) return { error: "Post not found." };

  await db
    .update(leaguePosts)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(leaguePosts.id, input.postId));

  const postType = isInkyPostType(post.postType) ? post.postType : "season_recap";
  await postInkyArticleToDiscord({
    postId: input.postId,
    postType,
    title: post.title,
    body: post.body,
    leagueId: input.leagueId,
    seasonId: input.seasonId,
  });

  revalidateNewsPaths(input.leagueId, input.seasonId);
  revalidatePostPaths(input.leagueId, input.seasonId, input.postId, post.relatedGameId);
  return {};
}

export async function updateLeaguePostAction(input: {
  postId: string;
  leagueId: string;
  seasonId: string;
  title: string;
  body: string;
}): Promise<{ error?: string }> {
  const auth = await requireCommissioner(input.leagueId);
  if ("error" in auth) return auth;

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Article body is required." };

  const [post] = await db
    .select({ id: leaguePosts.id, relatedGameId: leaguePosts.relatedGameId })
    .from(leaguePosts)
    .where(
      and(eq(leaguePosts.id, input.postId), eq(leaguePosts.leagueId, input.leagueId)),
    )
    .limit(1);
  if (!post) return { error: "Post not found." };

  await db
    .update(leaguePosts)
    .set({ title, body })
    .where(eq(leaguePosts.id, input.postId));

  revalidateNewsPaths(input.leagueId, input.seasonId);
  revalidatePostPaths(input.leagueId, input.seasonId, input.postId, post.relatedGameId);
  return {};
}

export async function deleteLeaguePostAction(input: {
  postId: string;
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const auth = await requireCommissioner(input.leagueId);
  if ("error" in auth) return auth;

  const [post] = await db
    .select({ relatedGameId: leaguePosts.relatedGameId })
    .from(leaguePosts)
    .where(
      and(eq(leaguePosts.id, input.postId), eq(leaguePosts.leagueId, input.leagueId)),
    )
    .limit(1);

  await db
    .delete(leaguePosts)
    .where(
      and(eq(leaguePosts.id, input.postId), eq(leaguePosts.leagueId, input.leagueId)),
    );

  revalidateNewsPaths(input.leagueId, input.seasonId);
  revalidatePostPaths(input.leagueId, input.seasonId, input.postId, post?.relatedGameId);
  return {};
}

export async function inkyConfiguredAction(): Promise<{ enabled: boolean }> {
  return { enabled: inkyEnabled() };
}
