"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CharacterIcon } from "@/components/CharacterIcon";
import { SectionHeading } from "@/components/SectionHeading";
import {
  lockDraftAction,
  makeDraftPickAction,
  redraftAction,
  runDraftLotteryAction,
  startDraftAction,
} from "@/server/actions";
import type { SeasonDraftView } from "@/lib/season-draft";

const POLL_INTERVAL_MS = 8000;

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function usePickCountdown(deadline: Date | null): string | null {
  const [label, setLabel] = useState<string | null>(() =>
    deadline ? formatCountdown(deadline.getTime() - Date.now()) : null,
  );

  useEffect(() => {
    if (!deadline) {
      setLabel(null);
      return;
    }
    const tick = () => setLabel(formatCountdown(deadline.getTime() - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return label;
}

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
  /** True once any game has reported stats — show recap only, no live draft. */
  readOnly?: boolean;
};

export function DraftBoard({
  leagueId,
  seasonId,
  seasonStatus,
  isAdmin,
  userTeamId,
  draft,
  available,
  readOnly = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clockChoice, setClockChoice] = useState("0");
  const router = useRouter();
  const countdown = usePickCountdown(readOnly ? null : draft.pickDeadline);

  useEffect(() => {
    if (readOnly || draft.status !== "active") return;
    const interval = setInterval(() => {
      if (!pending) router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [draft.status, pending, readOnly, router]);

  const canPick =
    !readOnly &&
    draft.status === "active" &&
    seasonStatus === "setup" &&
    draft.teamOnClockId != null &&
    (isAdmin || userTeamId === draft.teamOnClockId);

  const allPicks = useMemo(
    () => [...draft.picks].sort((a, b) => a.pickNumber - b.pickNumber),
    [draft.picks],
  );

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

  if (readOnly) {
    return (
      <div className="space-y-6">
        <section className="msb-panel p-4 sm:p-5">
          <SectionHeading>Draft recap</SectionHeading>
          <p className="mt-1 text-sm text-zinc-500">
            The season is underway — draft picks are frozen for the rest of the season.
          </p>
          {allPicks.length > 0 ? (
            <ol className="mt-4 space-y-2 text-sm text-zinc-300">
              {allPicks.map((pick) => (
                <li key={pick.pickNumber} className="flex flex-wrap items-center gap-2">
                  <span className="w-8 shrink-0 tabular-nums text-zinc-500">
                    #{pick.pickNumber}
                  </span>
                  <CharacterIcon charId={pick.gameCharId} size={28} />
                  <span className="font-medium text-zinc-200">{pick.displayName}</span>
                  <span className="text-zinc-500">→ {pick.teamName}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-zinc-400">No draft this season.</p>
          )}
        </section>
      </div>
    );
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
            <SectionHeading>Draft status</SectionHeading>
            <p className="mt-1 text-sm text-zinc-500">
              Snake draft — {draft.picksPerTeam} rounds per team. Locks when the first
              game is reported.
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
            {countdown ? (
              <span
                className={`ml-3 rounded-md border px-2 py-0.5 font-mono text-sm tabular-nums ${
                  countdown === "0:00"
                    ? "border-red-800/60 bg-red-950/40 text-red-300"
                    : "border-amber-800/50 bg-amber-950/30 text-amber-300"
                }`}
              >
                ⏱ {countdown === "0:00" ? "Time! Pick skipped on next refresh" : countdown}
              </span>
            ) : null}
          </p>
        ) : draft.status === "complete" ? (
          <p className="mt-4 text-sm text-emerald-300">Draft complete.</p>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-zinc-500">
              Draft is locked. Admins can run the lottery and start the draft during
              season setup.
            </p>
            {draft.teamOrderNames.length > 0 ? (
              <p className="mt-2 text-sm text-zinc-300">
                <span className="text-zinc-500">First-round order:</span>{" "}
                {draft.teamOrderNames.map((name, index) => (
                  <span key={`${name}-${index}`}>
                    {index > 0 ? <span className="text-zinc-600"> → </span> : null}
                    <span className="font-medium">{name}</span>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        )}

        {isAdmin && seasonStatus === "setup" ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {draft.status === "locked" ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    runAction(() => runDraftLotteryAction({ leagueId, seasonId }))
                  }
                  className="msb-btn-outline-gold px-4 py-2 text-sm"
                >
                  Run draft lottery
                </button>
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  Pick clock
                  <select
                    value={clockChoice}
                    onChange={(event) => setClockChoice(event.target.value)}
                    className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                  >
                    <option value="0">No clock</option>
                    <option value="60">1 minute</option>
                    <option value="120">2 minutes</option>
                    <option value="300">5 minutes</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    runAction(() =>
                      startDraftAction({
                        leagueId,
                        seasonId,
                        pickClockSeconds: Number(clockChoice) || null,
                      }),
                    )
                  }
                  className="msb-btn-primary px-4 py-2 text-sm"
                >
                  Start draft
                </button>
              </>
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

        {isAdmin && seasonStatus === "setup" ? (
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
          <SectionHeading>Make your pick</SectionHeading>
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
                  <CharacterIcon charId={instance.gameCharId} size={32} />
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
          <SectionHeading>Recent picks</SectionHeading>
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
