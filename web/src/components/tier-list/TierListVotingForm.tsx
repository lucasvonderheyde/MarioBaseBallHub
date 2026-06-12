"use client";

import { useMemo, useState, useTransition } from "react";
import { CharacterIcon } from "@/components/CharacterIcon";
import { saveTierBallotAction } from "@/server/actions";
import {
  TIER_OPTIONS,
  type CharacterTier,
} from "@/domain/tier-list/tiers";

type CharacterRow = {
  gameCharId: string;
  displayName: string;
};

type Props = {
  characters: CharacterRow[];
  initialTiers: Record<string, CharacterTier>;
};

const TIER_ROW_CLASS: Record<CharacterTier, string> = {
  S: "border-amber-700/60 bg-amber-950/30",
  A: "border-emerald-800/50 bg-emerald-950/25",
  B: "border-sky-800/50 bg-sky-950/25",
  C: "border-violet-800/50 bg-violet-950/25",
  D: "border-orange-800/50 bg-orange-950/25",
  F: "border-red-800/50 bg-red-950/25",
};

const TIER_LABEL_CLASS: Record<CharacterTier, string> = {
  S: "bg-amber-500 text-zinc-950",
  A: "bg-emerald-500 text-zinc-950",
  B: "bg-sky-500 text-zinc-950",
  C: "bg-violet-500 text-zinc-50",
  D: "bg-orange-600 text-zinc-50",
  F: "bg-red-700 text-zinc-50",
};

function CharacterChip({
  character,
  draggable = true,
  onDragStart,
}: {
  character: CharacterRow;
  draggable?: boolean;
  onDragStart?: (charId: string) => void;
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/char-id", character.gameCharId);
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.(character.gameCharId);
      }}
      className="flex cursor-grab items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm active:cursor-grabbing"
    >
      <CharacterIcon charId={character.gameCharId} size={28} />
      <span className="max-w-[8rem] truncate">{character.displayName}</span>
    </button>
  );
}

export function TierListVotingForm({ characters, initialTiers }: Props) {
  const [tiers, setTiers] = useState<Record<string, CharacterTier>>(initialTiers);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const catalogById = useMemo(
    () => new Map(characters.map((character) => [character.gameCharId, character])),
    [characters],
  );

  const assignedCount = useMemo(() => Object.keys(tiers).length, [tiers]);

  const unassigned = useMemo(
    () => characters.filter((character) => !tiers[character.gameCharId]),
    [characters, tiers],
  );

  function charsInTier(tier: CharacterTier): CharacterRow[] {
    return characters.filter((character) => tiers[character.gameCharId] === tier);
  }

  function assignTier(charId: string, tier: CharacterTier | null) {
    setTiers((current) => {
      const next = { ...current };
      if (tier) {
        next[charId] = tier;
      } else {
        delete next[charId];
      }
      return next;
    });
  }

  function handleDrop(tier: CharacterTier | null) {
    return (event: React.DragEvent) => {
      event.preventDefault();
      const charId = event.dataTransfer.getData("text/char-id");
      if (!charId || !catalogById.has(charId)) return;
      assignTier(charId, tier);
      setDraggingId(null);
    };
  }

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveTierBallotAction({ tiers });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Your tier list was saved. One ballot per account — you can update anytime.");
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}

      <p className="text-sm text-zinc-500">
        Drag characters into tiers like TierListMaker. {assignedCount} of{" "}
        {characters.length} characters tiered.
      </p>

      <div className="space-y-2">
        {TIER_OPTIONS.map((tier) => {
          const tierChars = charsInTier(tier);
          return (
            <div
              key={tier}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop(tier)}
              className={`flex min-h-16 items-stretch gap-3 rounded-lg border p-2 ${TIER_ROW_CLASS[tier]} ${
                draggingId ? "ring-1 ring-zinc-700/50" : ""
              }`}
            >
              <div
                className={`flex w-12 shrink-0 items-center justify-center rounded-md text-lg font-bold ${TIER_LABEL_CLASS[tier]}`}
              >
                {tier}
              </div>
              <div className="flex min-h-12 flex-1 flex-wrap content-start gap-2">
                {tierChars.map((character) => (
                  <CharacterChip
                    key={character.gameCharId}
                    character={character}
                    onDragStart={setDraggingId}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop(null)}
        className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/40 p-4"
      >
        <p className="text-sm font-medium text-zinc-400">Unranked pool</p>
        <p className="mt-1 text-xs text-zinc-600">
          Drop characters here to remove them from a tier.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {unassigned.map((character) => (
            <CharacterChip
              key={character.gameCharId}
              character={character}
              onDragStart={setDraggingId}
            />
          ))}
          {unassigned.length === 0 ? (
            <span className="text-sm text-zinc-600">All characters are tiered.</span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        disabled={pending || assignedCount === 0}
        onClick={submit}
        className="msb-btn-primary px-4 py-2"
      >
        {pending ? "Saving…" : "Save my tier list"}
      </button>
    </div>
  );
}
