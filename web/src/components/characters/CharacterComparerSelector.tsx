"use client";

import { useRouter } from "next/navigation";

type CharacterOption = {
  gameCharId: string;
  displayName: string;
};

type Props = {
  characters: CharacterOption[];
  charAId: string;
  charBId: string;
};

export function CharacterComparerSelector({ characters, charAId, charBId }: Props) {
  const router = useRouter();

  function navigate(nextA: string, nextB: string) {
    const params = new URLSearchParams();
    if (nextA) params.set("a", nextA);
    if (nextB) params.set("b", nextB);
    const query = params.toString();
    router.push(`/characters/compare${query ? `?${query}` : ""}`);
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-zinc-400">
        Character A
        <select
          value={charAId}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          onChange={(event) => navigate(event.target.value, charBId)}
        >
          <option value="">Select character…</option>
          {characters.map((character) => (
            <option key={character.gameCharId} value={character.gameCharId}>
              {character.displayName}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-400">
        Character B
        <select
          value={charBId}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          onChange={(event) => navigate(charAId, event.target.value)}
        >
          <option value="">Select character…</option>
          {characters.map((character) => (
            <option key={character.gameCharId} value={character.gameCharId}>
              {character.displayName}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
