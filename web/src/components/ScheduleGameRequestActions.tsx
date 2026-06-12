"use client";

import { useState, useTransition } from "react";
import {
  proposeGameTimeAction,
  respondGameScheduleAction,
} from "@/server/actions/manager-requests-actions";
import { isUserGameParticipant } from "@/lib/game-report-access";

type PendingProposal = {
  id: string;
  proposedByUserId: string;
  proposedPlayAt: Date;
  note: string | null;
};

type Props = {
  gameId: string;
  leagueId: string;
  seasonId: string;
  userId: string;
  homeManagerUserId: string | null;
  awayManagerUserId: string | null;
  agreedPlayAt: Date | null;
  pendingProposal: PendingProposal | null;
};

export function ScheduleGameRequestActions({
  gameId,
  leagueId,
  seasonId,
  userId,
  homeManagerUserId,
  awayManagerUserId,
  agreedPlayAt,
  pendingProposal,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isManager = isUserGameParticipant(
    userId,
    homeManagerUserId,
    awayManagerUserId,
  );

  if (!isManager || agreedPlayAt) return null;

  const opponentProposal =
    pendingProposal && pendingProposal.proposedByUserId !== userId
      ? pendingProposal
      : null;
  const ownProposal =
    pendingProposal && pendingProposal.proposedByUserId === userId
      ? pendingProposal
      : null;

  function handlePropose(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await proposeGameTimeAction({
        gameId,
        leagueId,
        seasonId,
        proposedPlayAt: String(formData.get("proposedPlayAt") ?? ""),
        note: String(formData.get("note") ?? ""),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setFormOpen(false);
    });
  }

  function handleRespond(decision: "accept" | "decline") {
    if (!opponentProposal) return;
    setError(null);
    startTransition(async () => {
      const result = await respondGameScheduleAction({
        proposalId: opponentProposal.id,
        leagueId,
        seasonId,
        decision,
      });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-950/40 px-4 py-4 sm:px-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Schedule game
      </p>

      {opponentProposal ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-zinc-300">
            Opponent proposed{" "}
            <span className="font-medium text-amber-300">
              {opponentProposal.proposedPlayAt.toLocaleString()}
            </span>
            {opponentProposal.note ? (
              <span className="block mt-1 text-zinc-500">
                Note: {opponentProposal.note}
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => handleRespond("accept")}
              className="msb-btn-primary text-xs"
            >
              Accept time
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleRespond("decline")}
              className="msb-btn-nav text-xs"
            >
              Decline
            </button>
          </div>
        </div>
      ) : !formOpen ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {ownProposal ? (
            <p className="text-xs text-zinc-500">
              Your proposal:{" "}
              <span className="text-amber-300">
                {ownProposal.proposedPlayAt.toLocaleString()}
              </span>{" "}
              — waiting on opponent.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="msb-btn-nav text-xs"
          >
            {ownProposal ? "Change time" : "Propose time"}
          </button>
        </div>
      ) : (
        <form action={handlePropose} className="mt-3 space-y-3">
          {ownProposal ? (
            <p className="text-xs text-zinc-500">
              Your proposal: {ownProposal.proposedPlayAt.toLocaleString()}. Submit
              a new time to replace it.
            </p>
          ) : null}
          <label className="block text-xs text-zinc-500">
            Proposed date & time
            <input
              type="datetime-local"
              name="proposedPlayAt"
              required
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Note (optional)
            <input
              type="text"
              name="note"
              placeholder="Discord, stadium preference, etc."
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="msb-btn-primary text-xs"
            >
              {ownProposal ? "Update proposal" : "Propose time"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="msb-btn-nav text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
