"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { InkyWritingIndicator } from "@/components/inky/InkyWritingIndicator";
import { inkyPostTypeLabel } from "@/domain/inky/post-types";
import { leaguePostPageHref } from "@/lib/league-news-links";
import {
  deleteLeaguePostAction,
  generateInkyGameRecapAction,
  publishLeaguePostAction,
  updateLeaguePostAction,
} from "@/server/actions/league-news-actions";

export type GameRecapPost = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published";
  createdAt: Date;
};

type Props = {
  leagueId: string;
  seasonId: string;
  gameId: string;
  isAdmin: boolean;
  aiEnabled: boolean;
  hasStats: boolean;
  post: GameRecapPost | null;
};

export function GameInkyPanel({
  leagueId,
  seasonId,
  gameId,
  isAdmin,
  aiEnabled,
  hasStats,
  post,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  if (!post && !(isAdmin && hasStats)) return null;

  function refreshAfterAction(result: { error?: string }) {
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      refreshAfterAction(await action());
    });
  }

  function runGenerate(action: () => Promise<{ error?: string }>) {
    setError(null);
    setGenerating(true);
    startTransition(async () => {
      try {
        refreshAfterAction(await action());
      } finally {
        setGenerating(false);
      }
    });
  }

  function startEditing() {
    if (!post) return;
    setEditing(true);
    setEditTitle(post.title);
    setEditBody(post.body);
    setError(null);
  }

  function cancelEditing() {
    setEditing(false);
    setEditTitle("");
    setEditBody("");
  }

  return (
    <Card title="Inky's desk">
      <div id="inky-recap" className="scroll-mt-24">
        {post ? (
          <article
            className={`rounded-lg border p-4 ${
              post.status === "draft"
                ? "border-amber-900/50 bg-amber-950/15"
                : "border-zinc-800/80 bg-zinc-950/30"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 flex-1 font-semibold text-zinc-100">{post.title}</h3>
              <span className="msb-badge-muted">Inky</span>
              <span className="rounded-md border border-zinc-700/60 bg-zinc-900/60 px-2 py-0.5 text-xs text-zinc-400">
                {inkyPostTypeLabel("game_recap")}
              </span>
              {post.status === "draft" ? (
                <span className="rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-xs text-amber-300">
                  Draft — commissioner review
                </span>
              ) : null}
            </div>

            {editing ? (
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
                    onClick={() =>
                      run(async () => {
                        const result = await updateLeaguePostAction({
                          postId: post.id,
                          leagueId,
                          seasonId,
                          title: editTitle,
                          body: editBody,
                        });
                        if (!result.error) cancelEditing();
                        return result;
                      })
                    }
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
                <Link
                  href={leaguePostPageHref(leagueId, seasonId, post.id)}
                  className="text-amber-400 hover:underline"
                >
                  Read full article →
                </Link>
              ) : null}
              {isAdmin ? (
                <>
                  {!editing ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={startEditing}
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
          </article>
        ) : generating ? (
          <InkyWritingIndicator message="Inky is writing the game recap…" />
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              Ask Inky to write a game recap from the uploaded box score. The recap stays
              on this game page for commissioner review before publishing.
            </p>
            <button
              type="button"
              disabled={!aiEnabled}
              title={aiEnabled ? undefined : "Set ANTHROPIC_API_KEY to enable Inky"}
              onClick={() =>
                runGenerate(() => generateInkyGameRecapAction({ leagueId, seasonId, gameId }))
              }
              className="msb-btn-outline-gold mt-3 text-sm"
            >
              Ask Inky for a recap
            </button>
          </>
        )}
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
