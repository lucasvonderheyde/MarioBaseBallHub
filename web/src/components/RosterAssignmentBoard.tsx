"use client";

import { useMemo, useState, useTransition } from "react";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import { assignRosterInstanceAction } from "@/server/actions/season-admin-actions";

export type RosterBoardInstance = {
  id: string;
  copyIndex: number;
  teamId: string | null;
  gameCharId: string;
  displayName: string;
  mugshotFile: string | null;
};

export type RosterBoardTeam = {
  id: string;
  name: string;
};

type Props = {
  leagueId: string;
  seasonId: string;
  teams: RosterBoardTeam[];
  instances: RosterBoardInstance[];
};

function CharacterChip({
  instance,
  duplicateCount,
  selected,
  disabled,
  onSelect,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  instance: RosterBoardInstance;
  duplicateCount: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  return (
    <button
      type="button"
      draggable={!disabled}
      onClick={onSelect}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex w-full cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-left text-sm transition active:cursor-grabbing ${
        selected
          ? "border-amber-500 bg-amber-950/40 ring-1 ring-amber-500/60"
          : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-600"
      } ${dragging ? "opacity-50" : ""}`}
    >
      <CharacterMugshot charId={instance.gameCharId} size={28} />
      <div className="min-w-0">
        <p className="truncate font-medium">{instance.displayName}</p>
        {duplicateCount > 1 ? (
          <p className="text-xs text-zinc-500">#{instance.copyIndex}</p>
        ) : null}
      </div>
    </button>
  );
}

export function RosterAssignmentBoard({
  leagueId,
  seasonId,
  teams,
  instances: initialInstances,
}: Props) {
  const [instances, setInstances] = useState(initialInstances);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStarted, setDragStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns = useMemo(() => {
    const byTeam = new Map<string | null, RosterBoardInstance[]>();
    byTeam.set(null, []);
    for (const team of teams) byTeam.set(team.id, []);
    for (const instance of instances) {
      const key = instance.teamId;
      const group = byTeam.get(key) ?? byTeam.get(null)!;
      group.push(instance);
    }
    for (const group of byTeam.values()) {
      group.sort(
        (a, b) =>
          a.displayName.localeCompare(b.displayName) || a.copyIndex - b.copyIndex,
      );
    }
    return byTeam;
  }, [instances, teams]);

  const duplicateCharIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const instance of instances) {
      counts.set(instance.gameCharId, (counts.get(instance.gameCharId) ?? 0) + 1);
    }
    return counts;
  }, [instances]);

  const selectedInstance = selectedInstanceId
    ? instances.find((instance) => instance.id === selectedInstanceId) ?? null
    : null;

  function assign(instanceId: string, teamId: string | null) {
    const previous = instances;
    setInstances((current) =>
      current.map((instance) =>
        instance.id === instanceId ? { ...instance, teamId } : instance,
      ),
    );
    startTransition(async () => {
      const result = await assignRosterInstanceAction({
        instanceId,
        teamId,
        seasonId,
        leagueId,
      });
      if (result.error) {
        setError(result.error);
        setInstances(previous);
      } else {
        setError(null);
      }
    });
  }

  function onDrop(teamId: string | null, instanceId: string) {
    setDraggingId(null);
    setDragStarted(false);
    const instance = instances.find((row) => row.id === instanceId);
    if (!instance || instance.teamId === teamId) return;
    assign(instanceId, teamId);
    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null);
    }
  }

  function handleCharacterSelect(instanceId: string) {
    if (dragStarted) return;
    setSelectedInstanceId((current) => (current === instanceId ? null : instanceId));
  }

  function handleTeamSelect(teamId: string | null) {
    if (!selectedInstanceId) return;
    const instance = instances.find((row) => row.id === selectedInstanceId);
    if (!instance || instance.teamId === teamId) {
      setSelectedInstanceId(null);
      return;
    }
    assign(selectedInstanceId, teamId);
    setSelectedInstanceId(null);
  }

  function renderCharacter(instance: RosterBoardInstance) {
    const duplicateCount = duplicateCharIds.get(instance.gameCharId) ?? 0;
    return (
      <CharacterChip
        key={instance.id}
        instance={instance}
        duplicateCount={duplicateCount}
        selected={selectedInstanceId === instance.id}
        disabled={isPending}
        dragging={draggingId === instance.id}
        onSelect={() => handleCharacterSelect(instance.id)}
        onDragStart={(event) => {
          setDragStarted(true);
          setDraggingId(instance.id);
          event.dataTransfer.setData("text/roster-instance", instance.id);
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          setDraggingId(null);
          window.setTimeout(() => setDragStarted(false), 0);
        }}
      />
    );
  }

  function TeamCard({ teamId, title }: { teamId: string | null; title: string }) {
    const rows = columns.get(teamId) ?? [];
    const canAssign = selectedInstanceId != null;
    const isCurrentTeam = selectedInstance?.teamId === teamId;

    return (
      <div
        className={`flex flex-col rounded-lg border bg-zinc-950/50 transition ${
          canAssign
            ? isCurrentTeam
              ? "border-zinc-700"
              : "border-amber-700/50 hover:border-amber-500/70"
            : "border-zinc-800"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const instanceId = event.dataTransfer.getData("text/roster-instance");
          if (instanceId) onDrop(teamId, instanceId);
        }}
      >
        <button
          type="button"
          disabled={!canAssign || isCurrentTeam}
          onClick={() => handleTeamSelect(teamId)}
          className={`border-b border-zinc-800 px-3 py-2 text-left transition ${
            canAssign && !isCurrentTeam
              ? "cursor-pointer bg-amber-950/20 hover:bg-amber-950/40"
              : "cursor-default"
          }`}
        >
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
          <p className="text-xs text-zinc-500">
            {rows.length} assigned
            {canAssign && !isCurrentTeam ? (
              <span className="ml-1 text-amber-400">· click to assign</span>
            ) : null}
          </p>
        </button>
        <ul className="flex flex-col gap-2 p-2">
          {rows.map((instance) => (
            <li key={instance.id}>{renderCharacter(instance)}</li>
          ))}
          {rows.length === 0 ? (
            <li className="rounded border border-dashed border-zinc-800 px-2 py-4 text-center text-xs text-zinc-600">
              {canAssign ? "Click header to assign here" : "No characters yet"}
            </li>
          ) : null}
        </ul>
      </div>
    );
  }

  const unassigned = columns.get(null) ?? [];

  return (
    <div className="mt-6 space-y-6">
      {error ? (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {isPending ? (
        <p className="text-xs text-zinc-500">Saving assignment…</p>
      ) : null}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-400">
        {selectedInstance ? (
          <p>
            Selected:{" "}
            <span className="font-medium text-amber-200">
              {selectedInstance.displayName}
              {(duplicateCharIds.get(selectedInstance.gameCharId) ?? 0) > 1
                ? ` (#${selectedInstance.copyIndex})`
                : ""}
            </span>
            {" — "}
            click a team below to assign, or click the character again to cancel.
          </p>
        ) : (
          <p>
            Click a character, then click a team. You can also drag characters onto
            a team.
          </p>
        )}
      </div>

      <section
        className={`rounded-lg border bg-zinc-950/50 transition ${
          selectedInstanceId != null && selectedInstance?.teamId != null
            ? "border-amber-700/50"
            : "border-zinc-800"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const instanceId = event.dataTransfer.getData("text/roster-instance");
          if (instanceId) onDrop(null, instanceId);
        }}
      >
        <button
          type="button"
          disabled={!selectedInstanceId || selectedInstance?.teamId == null}
          onClick={() => handleTeamSelect(null)}
          className={`w-full border-b border-zinc-800 px-3 py-2 text-left transition ${
            selectedInstanceId && selectedInstance?.teamId != null
              ? "cursor-pointer bg-amber-950/20 hover:bg-amber-950/40"
              : "cursor-default"
          }`}
        >
          <h2 className="text-lg font-semibold text-zinc-200">Unassigned</h2>
          <p className="text-sm text-zinc-500">
            {unassigned.length} characters
            {selectedInstanceId && selectedInstance?.teamId != null ? (
              <span className="ml-1 text-amber-400">· click to unassign</span>
            ) : null}
          </p>
        </button>
        {unassigned.length > 0 ? (
          <ul className="grid gap-2 p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {unassigned.map((instance) => (
              <li key={instance.id}>{renderCharacter(instance)}</li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-6 text-center text-sm text-zinc-600">
            All characters are on teams.
          </p>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Teams</h2>
          <span className="text-sm text-zinc-500">{teams.length} teams</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((team) => (
            <TeamCard key={team.id} teamId={team.id} title={team.name} />
          ))}
        </div>
      </section>
    </div>
  );
}
