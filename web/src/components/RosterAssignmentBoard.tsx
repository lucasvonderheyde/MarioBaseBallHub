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

export function RosterAssignmentBoard({
  leagueId,
  seasonId,
  teams,
  instances: initialInstances,
}: Props) {
  const [instances, setInstances] = useState(initialInstances);
  const [draggingId, setDraggingId] = useState<string | null>(null);
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
    const instance = instances.find((row) => row.id === instanceId);
    if (!instance || instance.teamId === teamId) return;
    assign(instanceId, teamId);
  }

  function Column({
    teamId,
    title,
    rowCount,
  }: {
    teamId: string | null;
    title: string;
    rowCount: number;
  }) {
    const rows = columns.get(teamId) ?? [];
    return (
      <div
        className="flex min-h-[12rem] min-w-[220px] flex-1 flex-col rounded-lg border border-zinc-800 bg-zinc-950/50"
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
        <div className="border-b border-zinc-800 px-3 py-2">
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
          <p className="text-xs text-zinc-500">{rowCount} assigned</p>
        </div>
        <ul className="flex flex-1 flex-col gap-2 p-2">
          {rows.map((instance) => (
            <li
              key={instance.id}
              draggable={!isPending}
              onDragStart={(event) => {
                setDraggingId(instance.id);
                event.dataTransfer.setData("text/roster-instance", instance.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDraggingId(null)}
              className={`flex cursor-grab items-center gap-2 rounded border border-zinc-800 bg-zinc-900/80 px-2 py-1.5 text-sm active:cursor-grabbing ${
                draggingId === instance.id ? "opacity-50" : ""
              }`}
            >
              <CharacterMugshot charId={instance.gameCharId} size={28} />
              <div className="min-w-0">
                <p className="truncate font-medium">{instance.displayName}</p>
                {(duplicateCharIds.get(instance.gameCharId) ?? 0) > 1 ? (
                  <p className="text-xs text-zinc-500">#{instance.copyIndex}</p>
                ) : null}
              </div>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="rounded border border-dashed border-zinc-800 px-2 py-6 text-center text-xs text-zinc-600">
              Drop characters here
            </li>
          ) : null}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {error ? (
        <p className="mb-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {isPending ? (
        <p className="mb-3 text-xs text-zinc-500">Saving assignment…</p>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <Column
          teamId={null}
          title="Unassigned"
          rowCount={(columns.get(null) ?? []).length}
        />
        {teams.map((team) => (
          <Column
            key={team.id}
            teamId={team.id}
            title={team.name}
            rowCount={(columns.get(team.id) ?? []).length}
          />
        ))}
      </div>
    </div>
  );
}
