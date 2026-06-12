"use client";

import { useMemo, useState, useTransition } from "react";
import { CharacterIcon } from "@/components/CharacterIcon";
import { saveTierBallotAction } from "@/server/actions";
import {
  TIER_OPTIONS,
  type CharacterTier,
  type OrderedTierBallot,
} from "@/domain/tier-list/tiers";
import {
  moveCharacterInBoard,
  type TierDropTarget,
} from "@/domain/tier-list/move-character";

type CharacterRow = {
  gameCharId: string;
  displayName: string;
};

type Props = {
  characters: CharacterRow[];
  initialBallot: OrderedTierBallot;
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

const DRAG_MIME = "application/x-tier-char";

function buildInitialState(
  characters: CharacterRow[],
  initialBallot: OrderedTierBallot,
): { tierOrder: OrderedTierBallot; unranked: string[] } {
  const catalogIds = new Set(characters.map((character) => character.gameCharId));
  const assigned = new Set<string>();
  const tierOrder: OrderedTierBallot = {};

  for (const tier of TIER_OPTIONS) {
    tierOrder[tier] = (initialBallot[tier] ?? []).filter((charId) => {
      if (!catalogIds.has(charId)) return false;
      assigned.add(charId);
      return true;
    });
  }

  const unranked = characters
    .filter((character) => !assigned.has(character.gameCharId))
    .map((character) => character.gameCharId);

  return { tierOrder, unranked };
}

function CharacterChip({
  character,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  character: CharacterRow;
  onDragStart: () => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(
          DRAG_MIME,
          JSON.stringify({ charId: character.gameCharId }),
        );
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex cursor-grab items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm active:cursor-grabbing"
    >
      <CharacterIcon charId={character.gameCharId} size={28} />
      <span className="max-w-[8rem] truncate">{character.displayName}</span>
    </button>
  );
}

export function TierListVotingForm({ characters, initialBallot }: Props) {
  const [{ tierOrder, unranked }, setBallot] = useState(() =>
    buildInitialState(characters, initialBallot),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const catalogById = useMemo(
    () => new Map(characters.map((character) => [character.gameCharId, character])),
    [characters],
  );

  const assignedCount = useMemo(
    () => TIER_OPTIONS.reduce((sum, tier) => sum + (tierOrder[tier]?.length ?? 0), 0),
    [tierOrder],
  );

  function readDragPayload(event: React.DragEvent): string | null {
    event.preventDefault();
    // Chips sit inside tier rows / the pool, which are drop targets too —
    // without this a single drop fires twice and corrupts the ballot.
    event.stopPropagation();
    const raw = event.dataTransfer.getData(DRAG_MIME);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { charId?: string };
      if (!parsed.charId || !catalogById.has(parsed.charId)) {
        return null;
      }
      return parsed.charId;
    } catch {
      return null;
    }
  }

  function handleDrop(target: TierDropTarget) {
    return (event: React.DragEvent) => {
      const charId = readDragPayload(event);
      if (!charId) return;
      setBallot((current) => moveCharacterInBoard(current, charId, target));
      setDraggingId(null);
    };
  }

  function handleDropOnTier(tier: CharacterTier, index: number) {
    return handleDrop({ kind: "tier", tier, index });
  }

  function handleDropOnPool(index: number) {
    return handleDrop({ kind: "pool", index });
  }

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveTierBallotAction({ ballot: tierOrder });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.ballot) {
        setBallot(buildInitialState(characters, result.ballot));
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
        Drag characters into tiers and reorder within each row. {assignedCount} of{" "}
        {characters.length} characters tiered.
      </p>

      <div className="space-y-2">
        {TIER_OPTIONS.map((tier) => {
          const tierCharIds = tierOrder[tier] ?? [];
          const tierChars = tierCharIds
            .map((charId) => catalogById.get(charId))
            .filter((character): character is CharacterRow => character != null);

          return (
            <div
              key={tier}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDropOnTier(tier, tierChars.length)}
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
                {tierChars.map((character, index) => (
                  <CharacterChip
                    key={character.gameCharId}
                    character={character}
                    onDragStart={() => setDraggingId(character.gameCharId)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDropOnTier(tier, index)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDropOnPool(unranked.length)}
        className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/40 p-4"
      >
        <p className="text-sm font-medium text-zinc-400">Unranked pool</p>
        <p className="mt-1 text-xs text-zinc-600">
          Drop characters here to remove them from a tier.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {unranked.map((charId, index) => {
            const character = catalogById.get(charId);
            if (!character) return null;
            return (
              <CharacterChip
                key={charId}
                character={character}
                onDragStart={() => setDraggingId(charId)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDropOnPool(index)}
              />
            );
          })}
          {unranked.length === 0 ? (
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
