"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { generateInkyGameRecapAction } from "@/server/actions/league-news-actions";

type Props = {
  leagueId: string;
  seasonId: string;
  gameId: string;
  isAdmin: boolean;
  aiEnabled: boolean;
  hasStats: boolean;
};

export function GameInkyPanel({
  leagueId,
  seasonId,
  gameId,
  isAdmin,
  aiEnabled,
  hasStats,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isAdmin || !hasStats) return null;

  function run() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await generateInkyGameRecapAction({ leagueId, seasonId, gameId });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Inky filed a draft recap on the season hub — review before publishing.");
    });
  }

  return (
    <Card title="Inky's desk">
      <p className="text-sm text-zinc-400">
        Ask Inky to write a game recap from the uploaded box score. The draft lands on
        the season hub for commissioner review.
      </p>
      {error ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending || !aiEnabled}
        title={aiEnabled ? undefined : "Set ANTHROPIC_API_KEY to enable Inky"}
        onClick={run}
        className="msb-btn-outline-gold mt-3 text-sm"
      >
        {pending ? "Inky is writing…" : "Ask Inky for a recap"}
      </button>
    </Card>
  );
}
