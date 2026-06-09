"use client";

import { useMemo, useState, useTransition } from "react";
import {
  proposeTradeAction,
  respondTradeAction,
  rescindTradeAction,
} from "@/server/actions/manager-requests-actions";
import {
  describeTradeInstances,
  type TradeRequestDisplay,
  type TradeRosterInstance,
} from "@/lib/trade-request-display";

type TeamOption = {
  id: string;
  name: string;
  managerUserId: string | null;
};

type Props = {
  leagueId: string;
  seasonId: string;
  userId: string;
  userTeam: { id: string; name: string } | null;
  teams: TeamOption[];
  roster: TradeRosterInstance[];
  pendingTrades: TradeRequestDisplay[];
};

export function SeasonTradePanel({
  leagueId,
  seasonId,
  userId,
  userTeam,
  teams,
  roster,
  pendingTrades,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [toTeamId, setToTeamId] = useState("");
  const [offeredIds, setOfferedIds] = useState<string[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const teamNameById = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  );

  const myRoster = useMemo(
    () => roster.filter((row) => row.teamId === userTeam?.id),
    [roster, userTeam?.id],
  );
  const theirRoster = useMemo(
    () => roster.filter((row) => row.teamId === toTeamId),
    [roster, toTeamId],
  );

  const incomingTrades = pendingTrades.filter(
    (trade) => trade.toTeamId === userTeam?.id,
  );
  const outgoingTrades = pendingTrades.filter(
    (trade) => trade.fromTeamId === userTeam?.id,
  );

  const opponentTeams = teams.filter(
    (team) => team.id !== userTeam?.id && team.managerUserId,
  );

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function handlePropose(event: React.FormEvent) {
    event.preventDefault();
    if (!userTeam || !toTeamId) return;
    setError(null);
    startTransition(async () => {
      const result = await proposeTradeAction({
        leagueId,
        seasonId,
        toTeamId,
        offeredInstanceIds: offeredIds,
        requestedInstanceIds: requestedIds,
        message,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOfferedIds([]);
      setRequestedIds([]);
      setMessage("");
    });
  }

  function handleRespond(tradeId: string, decision: "accept" | "decline") {
    setError(null);
    startTransition(async () => {
      const result = await respondTradeAction({
        tradeId,
        leagueId,
        seasonId,
        decision,
      });
      if (result.error) setError(result.error);
    });
  }

  function handleRescind(tradeId: string) {
    setError(null);
    startTransition(async () => {
      const result = await rescindTradeAction({ tradeId, leagueId, seasonId });
      if (result.error) setError(result.error);
    });
  }

  if (!userTeam) {
    return (
      <section className="mt-8 msb-panel p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Trades</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Claim a team to propose trades with other managers.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 msb-panel p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Trades</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Propose roster swaps with another manager. Each character copy counts as a
        separate player; both teams must keep at least 9 roster players.
      </p>

      {incomingTrades.length > 0 ? (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-300">Incoming offers</h3>
          {incomingTrades.map((trade) => (
            <div
              key={trade.id}
              className="rounded-md border border-amber-900/40 bg-amber-950/20 p-3 text-sm"
            >
              <p className="font-medium text-amber-200">
                From {teamNameById.get(trade.fromTeamId) ?? "team"}
              </p>
              <p className="mt-1 text-zinc-400">
                They offer:{" "}
                {describeTradeInstances(trade.offeredInstanceIds, roster).join(", ")}
              </p>
              <p className="mt-1 text-zinc-400">
                For:{" "}
                {describeTradeInstances(trade.requestedInstanceIds, roster).join(", ")}
              </p>
              {trade.message ? (
                <p className="mt-1 text-zinc-500">Note: {trade.message}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleRespond(trade.id, "accept")}
                  className="msb-btn-primary text-xs"
                >
                  Accept trade
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleRespond(trade.id, "decline")}
                  className="msb-btn-nav text-xs"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {outgoingTrades.length > 0 ? (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-300">Your pending offers</h3>
          {outgoingTrades.map((trade) => (
            <div
              key={trade.id}
              className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-sm"
            >
              <p className="font-medium text-zinc-200">
                To {teamNameById.get(trade.toTeamId) ?? "team"}
              </p>
              <p className="mt-1 text-zinc-400">
                You offer:{" "}
                {describeTradeInstances(trade.offeredInstanceIds, roster).join(", ")}
              </p>
              <p className="mt-1 text-zinc-400">
                For:{" "}
                {describeTradeInstances(trade.requestedInstanceIds, roster).join(", ")}
              </p>
              {trade.message ? (
                <p className="mt-1 text-zinc-500">Note: {trade.message}</p>
              ) : null}
              <div className="mt-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleRescind(trade.id)}
                  className="msb-btn-nav text-xs"
                >
                  Rescind offer
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <form onSubmit={handlePropose} className="mt-5 space-y-4">
        <label className="block text-sm text-zinc-400">
          Trade with
          <select
            value={toTeamId}
            onChange={(event) => {
              setToTeamId(event.target.value);
              setRequestedIds([]);
            }}
            required
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="">Select team…</option>
            {opponentTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="rounded-md border border-zinc-800 p-3">
            <legend className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              You offer ({userTeam.name})
            </legend>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
              {myRoster.map((row) => (
                <li key={row.id}>
                  <label className="flex items-center gap-2 text-zinc-300">
                    <input
                      type="checkbox"
                      checked={offeredIds.includes(row.id)}
                      onChange={() =>
                        setOfferedIds((ids) => toggleId(ids, row.id))
                      }
                    />
                    {row.displayName}
                    {row.copyIndex > 0 ? ` #${row.copyIndex + 1}` : ""}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className="rounded-md border border-zinc-800 p-3">
            <legend className="px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              You want
            </legend>
            {toTeamId ? (
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
                {theirRoster.map((row) => (
                  <li key={row.id}>
                    <label className="flex items-center gap-2 text-zinc-300">
                      <input
                        type="checkbox"
                        checked={requestedIds.includes(row.id)}
                        onChange={() =>
                          setRequestedIds((ids) => toggleId(ids, row.id))
                        }
                      />
                      {row.displayName}
                      {row.copyIndex > 0 ? ` #${row.copyIndex + 1}` : ""}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">Select an opponent team.</p>
            )}
          </fieldset>
        </div>

        <label className="block text-sm text-zinc-400">
          Message (optional)
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </label>

        <button type="submit" disabled={pending} className="msb-btn-primary text-sm">
          Send trade request
        </button>
      </form>

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
