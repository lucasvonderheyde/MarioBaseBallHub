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
  S: "msb-tier-row msb-tier-row-s",
  A: "msb-tier-row msb-tier-row-a",
  B: "msb-tier-row msb-tier-row-b",
  C: "msb-tier-row msb-tier-row-c",
  D: "msb-tier-row msb-tier-row-d",
  F: "msb-tier-row msb-tier-row-f",
};

const TIER_LABEL_CLASS: Record<CharacterTier, string> = {
  S: "msb-tier-label msb-tier-label-s",
  A: "msb-tier-label msb-tier-label-a",
  B: "msb-tier-label msb-tier-label-b",
  C: "msb-tier-label msb-tier-label-c",
  D: "msb-tier-label msb-tier-label-d",
  F: "msb-tier-label msb-tier-label-f",
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
      className="msb-tier-chip"
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
    <div className="mt-4 space-y-4">
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
              className={`flex min-h-16 items-stretch gap-3 p-2 ${TIER_ROW_CLASS[tier]} ${
                draggingId ? "msb-tier-row-active" : ""
              }`}
            >
              <div className={TIER_LABEL_CLASS[tier]}>
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
        className="msb-tier-pool"
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
