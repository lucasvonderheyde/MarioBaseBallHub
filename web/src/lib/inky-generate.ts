import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { InkyPostType } from "@/domain/inky/post-types";
import { inkyPostTypeLabel } from "@/domain/inky/post-types";
import { inkyArticleSystemPrompt } from "@/domain/inky/inky-persona";
import {
  buildDraftBrief,
  buildGameBrief,
  buildPreviewBrief,
  buildSeasonBrief,
  buildSeriesBrief,
  buildWeeklyBrief,
} from "@/lib/inky-briefs";

const articleSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export type GeneratedInkyArticle = z.infer<typeof articleSchema>;

export function inkyEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function briefPrompt(postType: InkyPostType, brief: string): string {
  return (
    `Write a ${inkyPostTypeLabel(postType).toLowerCase()} for the Mushroom Kingdom Morning Star ` +
    `from this league brief. Use only facts in the brief.\n\n${brief}`
  );
}

async function callInkyModel(
  postType: InkyPostType,
  brief: string,
): Promise<GeneratedInkyArticle | { error: string }> {
  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: process.env.AI_NEWS_MODEL || "claude-opus-4-8",
      max_tokens: postType === "series_recap" ? 6000 : 4000,
      thinking: { type: "adaptive" },
      system: inkyArticleSystemPrompt(postType),
      messages: [{ role: "user", content: briefPrompt(postType, brief) }],
      output_config: { format: zodOutputFormat(articleSchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return { error: "Inky could not file this story. Try again." };
    }
    return response.parsed_output;
  } catch (error) {
    console.error("generateInkyArticle failed", { postType, error });
    return { error: "Story generation failed. Check the server logs." };
  }
}

export async function generateInkyArticleFromBrief(
  postType: InkyPostType,
  brief: string,
): Promise<GeneratedInkyArticle | { error: string }> {
  if (!inkyEnabled()) {
    return { error: "Inky is not configured. Set ANTHROPIC_API_KEY." };
  }
  return callInkyModel(postType, brief);
}

export async function generateInkyGameRecap(
  seasonId: string,
  gameId: string,
): Promise<(GeneratedInkyArticle & { brief: string }) | { error: string }> {
  const brief = await buildGameBrief(seasonId, gameId);
  if (!brief) return { error: "Game not found or stats not uploaded yet." };
  const article = await generateInkyArticleFromBrief("game_recap", brief);
  if ("error" in article) return article;
  return { ...article, brief };
}

export async function generateInkyWeeklyColumn(
  seasonId: string,
  weekNumber?: number,
): Promise<
  (GeneratedInkyArticle & { weekNumber: number; brief: string }) | { error: string }
> {
  const built = await buildWeeklyBrief(seasonId, weekNumber);
  if (!built) return { error: "Season not found or no weeks in schedule." };
  const article = await generateInkyArticleFromBrief("weekly", built.brief);
  if ("error" in article) return article;
  return { ...article, weekNumber: built.weekNumber, brief: built.brief };
}

export async function generateInkySeriesRecap(
  seasonId: string,
  seriesKey: string,
): Promise<(GeneratedInkyArticle & { brief: string }) | { error: string }> {
  const brief = await buildSeriesBrief(seasonId, seriesKey);
  if (!brief) return { error: "Series not found or no games played yet." };
  const article = await generateInkyArticleFromBrief("series_recap", brief);
  if ("error" in article) return article;
  return { ...article, brief };
}

export async function generateInkyPreview(
  seasonId: string,
  gameId: string,
): Promise<(GeneratedInkyArticle & { brief: string }) | { error: string }> {
  const brief = await buildPreviewBrief(seasonId, gameId);
  if (!brief) return { error: "Game not found." };
  const article = await generateInkyArticleFromBrief("preview", brief);
  if ("error" in article) return article;
  return { ...article, brief };
}

export async function generateInkyDraftRecap(
  seasonId: string,
  variant: "lottery" | "complete",
): Promise<(GeneratedInkyArticle & { brief: string }) | { error: string }> {
  const brief = await buildDraftBrief(seasonId, variant);
  if (!brief) return { error: "Season not found." };
  const article = await generateInkyArticleFromBrief("draft_recap", brief);
  if ("error" in article) return article;
  return { ...article, brief };
}

export async function generateInkySeasonRecap(
  seasonId: string,
): Promise<(GeneratedInkyArticle & { brief: string }) | { error: string }> {
  const brief = await buildSeasonBrief(seasonId);
  if (!brief) return { error: "Season not found." };
  const article = await generateInkyArticleFromBrief("season_recap", brief);
  if ("error" in article) return article;
  return { ...article, brief };
}
