"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import {
  INKY_BYLINE,
  INKY_DISPLAY_NAME,
  INKY_PROFILE_IMAGE,
} from "@/domain/inky/inky-persona";
import { inkyPostTypeLabel, isInkyPostType } from "@/domain/inky/post-types";
import {
  deleteLeaguePostAction,
  generateInkyDraftRecapAction,
  generateInkyPreviewAction,
  generateInkySeriesRecapAction,
  generateInkyWeeklyAction,
  generateSeasonRecapAction,
  publishLeaguePostAction,
} from "@/server/actions/league-news-actions";

export type SeasonNewsPost = {
  id: string;
  title: string;
  body: string;
  source: "ai" | "human";
  status: "draft" | "published";
  postType: string;
  createdAt: Date;
};

type SeriesOption = {
  seriesKey: string;
  label: string;
  isComplete: boolean;
};

type Props = {
  leagueId: string;
  seasonId: string;
  posts: SeasonNewsPost[];
  isAdmin: boolean;
  aiEnabled: boolean;
  seriesOptions: SeriesOption[];
  previewGameId?: string | null;
};

export function SeasonNewsPanel({
  leagueId,
  seasonId,
  posts,
  isAdmin,
  aiEnabled,
  seriesOptions,
  previewGameId,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [seriesKey, setSeriesKey] = useState(seriesOptions[0]?.seriesKey ?? "");

  if (posts.length === 0 && !isAdmin) return null;

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-3">
          <Image
            src={INKY_PROFILE_IMAGE}
            alt={INKY_DISPLAY_NAME}
            width={40}
            height={40}
            className="rounded-full border border-zinc-700 object-cover"
          />
          <div>
            <p className="font-semibold text-zinc-100">Morning Star</p>
            <p className="text-xs font-normal text-zinc-500">{INKY_BYLINE}</p>
          </div>
        </div>
      }
      action={
        isAdmin ? (
          <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={pending || !aiEnabled}
              title={aiEnabled ? undefined : "Set ANTHROPIC_API_KEY to enable Inky"}
              onClick={() => run(() => generateSeasonRecapAction({ leagueId, seasonId }))}
              className="msb-btn-outline-gold shrink-0 text-xs"
            >
              Season roundup
            </button>
            <button
              type="button"
              disabled={pending || !aiEnabled}
              onClick={() => run(() => generateInkyWeeklyAction({ leagueId, seasonId }))}
              className="msb-btn-outline-gold shrink-0 text-xs"
            >
              Weekly column
            </button>
            {previewGameId ? (
              <button
                type="button"
                disabled={pending || !aiEnabled}
                onClick={() =>
                  run(() =>
                    generateInkyPreviewAction({
                      leagueId,
                      seasonId,
                      gameId: previewGameId,
                    }),
                  )
                }
                className="msb-btn-outline-gold shrink-0 text-xs"
              >
                Rivalry preview
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending || !aiEnabled}
              onClick={() =>
                run(() =>
                  generateInkyDraftRecapAction({
                    leagueId,
                    seasonId,
                    variant: "lottery",
                  }),
                )
              }
              className="msb-btn-outline-gold shrink-0 text-xs"
            >
              Draft lottery
            </button>
            <button
              type="button"
              disabled={pending || !aiEnabled}
              onClick={() =>
                run(() =>
                  generateInkyDraftRecapAction({
                    leagueId,
                    seasonId,
                    variant: "complete",
                  }),
                )
              }
              className="msb-btn-outline-gold shrink-0 text-xs"
            >
              Draft recap
            </button>
          </div>
        ) : undefined
      }
    >
      {isAdmin && seriesOptions.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-zinc-500">
            Playoff series
            <select
              value={seriesKey}
              onChange={(event) => setSeriesKey(event.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
            >
              {seriesOptions.map((option) => (
                <option key={option.seriesKey} value={option.seriesKey}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || !aiEnabled || !seriesKey}
            onClick={() =>
              run(() =>
                generateInkySeriesRecapAction({ leagueId, seasonId, seriesKey }),
              )
            }
            className="msb-btn-outline-gold text-xs"
          >
            Series recap
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mb-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {posts.length > 0 ? (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li
              key={post.id}
              className={`rounded-lg border p-4 ${
                post.status === "draft"
                  ? "border-amber-900/50 bg-amber-950/15"
                  : "border-zinc-800/80 bg-zinc-950/30"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 flex-1 font-semibold text-zinc-100">
                  {post.title}
                </h3>
                {post.source === "ai" ? (
                  <span className="msb-badge-muted">Inky</span>
                ) : null}
                {isInkyPostType(post.postType) ? (
                  <span className="rounded-md border border-zinc-700/60 bg-zinc-900/60 px-2 py-0.5 text-xs text-zinc-400">
                    {inkyPostTypeLabel(post.postType)}
                  </span>
                ) : null}
                {post.status === "draft" ? (
                  <span className="rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-xs text-amber-300">
                    Draft — commissioner review
                  </span>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                {post.body}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                {post.createdAt.toLocaleDateString()}
                {isAdmin ? (
                  <>
                    {post.status === "draft" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            publishLeaguePostAction({ postId: post.id, leagueId, seasonId }),
                          )
                        }
                        className="msb-btn-primary text-xs"
                      >
                        Publish
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          deleteLeaguePostAction({ postId: post.id, leagueId, seasonId }),
                        )
                      }
                      className="text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="msb-empty-state">
          <p className="text-sm text-zinc-500">No stories filed yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Inky drafts every article for commissioner review before it goes live
            {aiEnabled ? "." : " — set ANTHROPIC_API_KEY to enable generation."}
          </p>
        </div>
      )}
    </Card>
  );
}
