"use server";

import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leaguePosts } from "@/db/schema";
import { generateSeasonRecap } from "@/lib/ai-news";
import { requireUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";

function revalidateNewsPaths(leagueId: string, seasonId: string) {
  revalidatePath(`/leagues/${leagueId}/seasons/${seasonId}`);
}

export async function generateSeasonRecapAction(input: {
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Only commissioners can generate news." };

  const recap = await generateSeasonRecap(input.seasonId);
  if ("error" in recap) return { error: recap.error };

  await db.insert(leaguePosts).values({
    id: crypto.randomUUID(),
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    title: recap.title,
    body: recap.body,
    source: "ai",
    status: "draft",
    createdByUserId: user.id,
    createdAt: new Date(),
  });

  revalidateNewsPaths(input.leagueId, input.seasonId);
  return {};
}

export async function publishLeaguePostAction(input: {
  postId: string;
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Only commissioners can publish news." };

  await db
    .update(leaguePosts)
    .set({ status: "published", publishedAt: new Date() })
    .where(
      and(eq(leaguePosts.id, input.postId), eq(leaguePosts.leagueId, input.leagueId)),
    );

  revalidateNewsPaths(input.leagueId, input.seasonId);
  return {};
}

export async function deleteLeaguePostAction(input: {
  postId: string;
  leagueId: string;
  seasonId: string;
}): Promise<{ error?: string }> {
  const user = await requireUser();
  const role = await getLeagueRole(input.leagueId, user);
  if (role !== "admin") return { error: "Only commissioners can delete news." };

  await db
    .delete(leaguePosts)
    .where(
      and(eq(leaguePosts.id, input.postId), eq(leaguePosts.leagueId, input.leagueId)),
    );

  revalidateNewsPaths(input.leagueId, input.seasonId);
  return {};
}
