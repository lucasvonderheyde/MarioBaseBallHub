import Link from "next/link";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import {
  fieldingRatePerGame,
  formatFieldingRate,
  formatPrimaryPosition,
} from "@/domain/stats/fielding-metrics";
import type { FieldingLine } from "@/lib/game-stats-queries";

type FieldingGridCharacter = {
  gameCharId: string;
  displayName: string;
};

type Props = {
  characters: FieldingGridCharacter[];
  fielding: Map<string, FieldingLine>;
  /** Defaults to the global character page. */
  hrefFor?: (gameCharId: string) => string;
};

export function GlobalCharacterFieldingGrid({ characters, fielding, hrefFor }: Props) {
  if (characters.length === 0) return null;

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {characters.map((character) => {
        const line = fielding.get(character.gameCharId);
        const href = hrefFor
          ? hrefFor(character.gameCharId)
          : `/characters/${encodeURIComponent(character.gameCharId)}`;
        const outsPerGame = line
          ? formatFieldingRate(fieldingRatePerGame(line.outs, line.games))
          : "—";
        const primaryPosition = line
          ? formatPrimaryPosition(line.battersByPosition)
          : "—";

        return (
          <Link
            key={character.gameCharId}
            href={href}
            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-600"
          >
            <CharacterMugshot charId={character.gameCharId} size={48} />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">{character.displayName}</p>
              <p className="font-mono text-xs text-zinc-600">{character.gameCharId}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {line
                  ? `${line.games}G · ${primaryPosition} · ${line.outs} outs · ${outsPerGame} O/G · ${line.bigPlays} BP`
                  : "0G · — · 0 outs · — O/G · 0 BP"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
