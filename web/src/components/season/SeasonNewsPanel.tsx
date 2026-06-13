"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import {
  INKY_BYLINE,
  INKY_DISPLAY_NAME,
  INKY_PROFILE_IMAGE,
} from "@/domain/inky/inky-persona";
import { inkyPostTypeLabel, isInkyPostType } from "@/domain/inky/post-types";
import { InkyWritingIndicator } from "@/components/inky/InkyWritingIndicator";
import { gameRecapPageHref, leaguePostPageHref } from "@/lib/league-news-links";
import {
  deleteLeaguePostAction,
  generateInkyDraftRecapAction,
  generateInkyPreviewAction,
  generateInkySeriesRecapAction,
  generateInkyWeeklyAction,
  generateSeasonRecapAction,
  publishLeaguePostAction,
  updateLeaguePostAction,
} from "@/server/actions/league-news-actions";

export type SeasonNewsPost = {
  id: string;
  title: string;
  body: string;
  source: "ai" | "human";
  status: "draft" | "published";
  postType: string;
  relatedGameId?: string | null;
  createdAt: Date;
};

type SeriesOption = {
  seriesKey: string;
  label: string;
  isComplete: boolean;
};

type PreviewGameOption = {
  gameId: string;
  label: string;
  isPlayoff: boolean;
};

type Props = {
  leagueId: string;
  seasonId: string;
  posts: SeasonNewsPost[];
  isAdmin: boolean;
  aiEnabled: boolean;
  seriesOptions: SeriesOption[];
  previewGames?: PreviewGameOption[];
};

export function SeasonNewsPanel({
  leagueId,
  seasonId,
  posts,
  isAdmin,
  aiEnabled,
  seriesOptions,
  previewGames = [],
}: Props) {
  const [pending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seriesKey, setSeriesKey] = useState(seriesOptions[0]?.seriesKey ?? "");
  const [previewGameId, setPreviewGameId] = useState(previewGames[0]?.gameId ?? "");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  if (posts.length === 0 && !isAdmin) return null;

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  function runGenerate(action: () => Promise<{ error?: string }>) {
    setError(null);
    setGenerating(true);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) setError(result.error);
      } finally {
        setGenerating(false);
      }
    });
  }

  function startEditing(post: SeasonNewsPost) {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditBody(post.body);
    setError(null);
  }

  function cancelEditing() {
    setEditingPostId(null);
    setEditTitle("");
    setEditBody("");
  }

  function saveEdit(postId: string) {
    run(async () => {
      const result = await updateLeaguePostAction({
        postId,
        leagueId,
        seasonId,
        title: editTitle,
        body: editBody,
      });
      if (!result.error) cancelEditing();
      return result;
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
              onClick={() => runGenerate(() => generateSeasonRecapAction({ leagueId, seasonId }))}
              className="msb-btn-outline-gold shrink-0 text-xs"
            >
              Season roundup
            </button>
            <button
              type="button"
              disabled={pending || !aiEnabled}
              onClick={() => runGenerate(() => generateInkyWeeklyAction({ leagueId, seasonId }))}
              className="msb-btn-outline-gold shrink-0 text-xs"
            >
              Weekly column
            </button>
            {previewGames.length > 0 ? (
              <button
                type="button"
                disabled={pending || !aiEnabled || !previewGameId}
                onClick={() =>
                  runGenerate(() =>
                    generateInkyPreviewAction({
                      leagueId,
                      seasonId,
                      gameId: previewGameId,
                    }),
                  )
                }
                className="msb-btn-outline-gold shrink-0 text-xs"
              >
                Matchup preview
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending || !aiEnabled}
              onClick={() =>
                runGenerate(() =>
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
                runGenerate(() =>
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
      {isAdmin && previewGames.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-zinc-500">
            Upcoming matchup preview
            <select
              value={previewGameId}
              onChange={(event) => setPreviewGameId(event.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
            >
              {previewGames.map((option) => (
                <option key={option.gameId} value={option.gameId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

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
              runGenerate(() =>
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

      {generating ? (
        <InkyWritingIndicator compact={posts.length > 0} />
      ) : null}

      {posts.length > 0 ? (
        <ul className="space-y-4">
          {posts.map((post) => {
            const isGameRecap =
              post.postType === "game_recap" && post.relatedGameId != null;
            const gameRecapHref = isGameRecap
              ? gameRecapPageHref(leagueId, seasonId, post.relatedGameId!)
              : null;
            const articleHref = leaguePostPageHref(leagueId, seasonId, post.id);
            const titleHref =
              post.status === "published" ? articleHref : gameRecapHref;

            if (isGameRecap && gameRecapHref) {
              return (
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
                      {titleHref ? (
                        <Link href={titleHref} className="hover:text-amber-300">
                          {post.title}
                        </Link>
                      ) : (
                        post.title
                      )}
                    </h3>
                    {post.source === "ai" ? (
                      <span className="msb-badge-muted">Inky</span>
                    ) : null}
                    <span className="rounded-md border border-zinc-700/60 bg-zinc-900/60 px-2 py-0.5 text-xs text-zinc-400">
                      {inkyPostTypeLabel("game_recap")}
                    </span>
                    {post.status === "draft" ? (
                      <span className="rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-xs text-amber-300">
                        Draft — commissioner review
                      </span>
                    ) : null}
                  </div>
                  {post.body ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">
                      {post.body}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                    {post.createdAt.toLocaleDateString()}
                    {post.status === "published" ? (
                      <Link href={articleHref} className="text-amber-400 hover:underline">
                        Read full article →
                      </Link>
                    ) : null}
                    <Link href={gameRecapHref} className="text-amber-400 hover:underline">
                      {isAdmin && post.status === "draft"
                        ? "Review on game page →"
                        : "Box score →"}
                    </Link>
                  </div>
                </li>
              );
            }

            return (
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
                  {post.status === "published" ? (
                    <Link href={articleHref} className="hover:text-amber-300">
                      {post.title}
                    </Link>
                  ) : (
                    post.title
                  )}
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
              {editingPostId === post.id ? (
                <div className="mt-3 space-y-3">
                  <label className="block text-xs text-zinc-500">
                    Headline
                    <input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Article
                    <textarea
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      rows={10}
                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm leading-relaxed text-zinc-100"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveEdit(post.id)}
                      className="msb-btn-primary text-xs"
                    >
                      Save edits
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={cancelEditing}
                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                  {post.body}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                {post.createdAt.toLocaleDateString()}
                {post.status === "published" ? (
                  <Link href={articleHref} className="text-amber-400 hover:underline">
                    Read full article →
                  </Link>
                ) : null}
                {isAdmin ? (
                  <>
                    {editingPostId !== post.id ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startEditing(post)}
                        className="text-amber-400 hover:underline"
                      >
                        Edit
                      </button>
                    ) : null}
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
            );
          })}
        </ul>
      ) : !generating ? (
        <div className="msb-empty-state">
          <p className="text-sm text-zinc-500">No stories filed yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Inky drafts every article for commissioner review before it goes live
            {aiEnabled ? "." : " — set ANTHROPIC_API_KEY to enable generation."}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
