import Link from "next/link";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import {
  earnedRunAverage,
  formatEra,
  inningsPitched,
} from "@/domain/stats/batting-metrics";
import type { PitchingLine } from "@/lib/game-stats-queries";
import type { GlobalCharacterEntry } from "@/lib/global-character-stats";

type Props = {
  characters: GlobalCharacterEntry[];
  pitching: Map<string, PitchingLine>;
};

export function GlobalCharacterPitchingGrid({ characters, pitching }: Props) {
  if (characters.length === 0) return null;

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {characters.map((character) => {
        const line = pitching.get(character.gameCharId);
        const href = `/characters/${encodeURIComponent(character.gameCharId)}`;
        const era = line
          ? formatEra(earnedRunAverage(line.earnedRuns, line.outsPitched))
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
                  ? `${line.games}G · ${inningsPitched(line.outsPitched)} IP · ${era} ERA · ${line.strikeouts} K`
                  : "0G · 0.0 IP · — ERA · 0 K"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
