"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import {
  deleteLeaguePostAction,
  generateSeasonRecapAction,
  publishLeaguePostAction,
} from "@/server/actions/league-news-actions";

export type SeasonNewsPost = {
  id: string;
  title: string;
  body: string;
  source: "ai" | "human";
  status: "draft" | "published";
  createdAt: Date;
};

type Props = {
  leagueId: string;
  seasonId: string;
  posts: SeasonNewsPost[];
  isAdmin: boolean;
  aiEnabled: boolean;
};

export function SeasonNewsPanel({ leagueId, seasonId, posts, isAdmin, aiEnabled }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      title="League news"
      action={
        isAdmin ? (
          <button
            type="button"
            disabled={pending || !aiEnabled}
            title={aiEnabled ? undefined : "Set ANTHROPIC_API_KEY to enable the AI reporter"}
            onClick={() => run(() => generateSeasonRecapAction({ leagueId, seasonId }))}
            className="msb-btn-outline-gold shrink-0 text-xs"
          >
            {pending ? "Writing…" : "Generate recap"}
          </button>
        ) : undefined
      }
    >
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
                  <span className="msb-badge-muted">AI reporter</span>
                ) : null}
                {post.status === "draft" ? (
                  <span className="rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-xs text-amber-300">
                    Draft — only commissioners see this
                  </span>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">
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
          <p className="text-sm text-zinc-500">No news yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Generate an AI recap of the season&apos;s recent action — you review it
            before it goes live.
          </p>
        </div>
      )}
    </Card>
  );
}
