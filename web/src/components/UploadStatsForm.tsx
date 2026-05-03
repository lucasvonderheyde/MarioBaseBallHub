"use client";

import { useActionState } from "react";
import {
  uploadStatsFormAction,
  type UploadStatsState,
} from "@/server/actions";

type Props = {
  gameId: string;
  leagueId: string;
  seasonId: string;
};

export function UploadStatsForm({ gameId, leagueId, seasonId }: Props) {
  const [state, action, pending] = useActionState(uploadStatsFormAction, null);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="leagueId" value={leagueId} />
      <input type="hidden" name="seasonId" value={seasonId} />
      <textarea
        name="json"
        required
        rows={6}
        placeholder="Paste full decoded JSON…"
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-100"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-500 px-3 py-1 text-sm font-medium text-zinc-950 disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Save stats to this game"}
      </button>
      {state && "error" in state ? (
        <p className="text-sm text-red-400">{state.error}</p>
      ) : null}
      {state && "ok" in state && state.ok ? (
        <p className="text-sm text-emerald-400">Stats saved.</p>
      ) : null}
      {state && "ok" in state && state.ok && state.warnings?.length ? (
        <ul className="list-inside list-disc text-sm text-amber-200">
          {state.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
