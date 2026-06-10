"use client";

import { useMemo, useState, useTransition } from "react";
import { CharacterMugshot } from "@/components/CharacterMugshot";
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

export function TierListVotingForm({ characters, initialTiers }: Props) {
  const [tiers, setTiers] = useState<Record<string, CharacterTier>>(initialTiers);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignedCount = useMemo(
    () => Object.keys(tiers).length,
    [tiers],
  );

  function setTier(charId: string, tier: CharacterTier) {
    setTiers((current) => ({ ...current, [charId]: tier }));
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
        {assignedCount} of {characters.length} characters tiered. Submit once — you can
        change your vote later.
      </p>

      <ul className="space-y-2">
        {characters.map((character) => (
          <li
            key={character.gameCharId}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2"
          >
            <CharacterMugshot charId={character.gameCharId} size={32} />
            <span className="min-w-0 flex-1 text-sm font-medium text-zinc-200">
              {character.displayName}
            </span>
            <select
              value={tiers[character.gameCharId] ?? ""}
              onChange={(event) =>
                setTier(character.gameCharId, event.target.value as CharacterTier)
              }
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
            >
              <option value="">—</option>
              {TIER_OPTIONS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>

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
