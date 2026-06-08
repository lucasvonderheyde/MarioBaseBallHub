"use client";

import { useTransition } from "react";
import { backfillStatsAction } from "@/server/actions";

type Props = {
  seasonId: string;
  leagueId: string;
};

export function BackfillStatsButton({ seasonId, leagueId }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="rounded border border-zinc-600 px-3 py-1 text-sm disabled:opacity-50"
      onClick={() => {
        startTransition(async () => {
          const result = await backfillStatsAction(seasonId, leagueId);
          if ("error" in result) alert(result.error);
          else alert(`Backfilled ${result.count} game(s).`);
        });
      }}
    >
      {pending ? "Backfilling…" : "Backfill parsed stats"}
    </button>
  );
}
