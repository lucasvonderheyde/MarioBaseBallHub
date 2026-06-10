"use client";

import { useMemo, useState, useTransition } from "react";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import {
  lockDraftAction,
  makeDraftPickAction,
  redraftAction,
  startDraftAction,
} from "@/server/actions";
import type { SeasonDraftView } from "@/lib/season-draft";

export type DraftAvailableInstance = {
  id: string;
  gameCharId: string;
  displayName: string;
  copyIndex: number;
};

type Props = {
  leagueId: string;
  seasonId: string;
  seasonStatus: "setup" | "active" | "completed";
  isAdmin: boolean;
  userTeamId: string | null;
  draft: SeasonDraftView;
  available: DraftAvailableInstance[];
};

export function DraftBoard({
  leagueId,
  seasonId,
  seasonStatus,
  isAdmin,
  userTeamId,
  draft,
  available,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canPick =
    draft.status === "active" &&
    seasonStatus === "setup" &&
    draft.teamOnClockId != null &&
    (isAdmin || userTeamId === draft.teamOnClockId);

  const recentPicks = useMemo(
    () => [...draft.picks].sort((a, b) => b.pickNumber - a.pickNumber).slice(0, 8),
    [draft.picks],
  );

  function runAction(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <section className="msb-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Draft status</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Snake draft — {draft.picksPerTeam} rounds per team. Locked once the
              season goes active.
            </p>
          </div>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase tracking-wide text-zinc-400">
            {draft.status}
          </span>
        </div>

        {draft.status === "active" ? (
          <p className="mt-4 text-sm text-zinc-300">
            On the clock:{" "}
            <span className="font-semibold text-amber-400">
              {draft.teamOnClockName ?? "—"}
            </span>{" "}
            · Pick {draft.currentPickIndex + 1} of {draft.totalPicks}
          </p>
        ) : draft.status === "complete" ? (
          <p className="mt-4 text-sm text-emerald-300">Draft complete.</p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Draft is locked. Admins can start a new draft during season setup.
          </p>
        )}

        {isAdmin && seasonStatus === "setup" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {draft.status === "locked" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => runAction(() => startDraftAction({ leagueId, seasonId }))}
                className="msb-btn-primary px-4 py-2 text-sm"
              >
                Start draft
              </button>
            ) : null}
            {draft.status === "active" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => runAction(() => lockDraftAction({ leagueId, seasonId }))}
                className="msb-btn-outline px-4 py-2 text-sm"
              >
                Lock draft
              </button>
            ) : null}
          </div>
        ) : null}

        {isAdmin && (seasonStatus === "setup" || seasonStatus === "active") ? (
          <div className="mt-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => runAction(() => redraftAction({ leagueId, seasonId }))}
              className="text-xs text-red-400 hover:underline"
            >
              Admin: reset draft and clear all roster assignments
            </button>
          </div>
        ) : null}
      </section>

      {canPick ? (
        <section className="msb-panel p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Make your pick</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {available.length} characters available in the pool.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((instance) => (
              <li key={instance.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    runAction(() =>
                      makeDraftPickAction({
                        leagueId,
                        seasonId,
                        rosterInstanceId: instance.id,
                      }),
                    )
                  }
                  className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-left text-sm hover:border-amber-700/50"
                >
                  <CharacterMugshot charId={instance.gameCharId} size={32} />
                  <span>
                    {instance.displayName}
                    {instance.copyIndex > 0 ? ` #${instance.copyIndex + 1}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recentPicks.length > 0 ? (
        <section className="msb-panel p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Recent picks</h2>
          <ol className="mt-3 space-y-2 text-sm text-zinc-300">
            {recentPicks.map((pick) => (
              <li key={pick.pickNumber}>
                #{pick.pickNumber} {pick.teamName} — {pick.displayName}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
