import Link from "next/link";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import type { LeagueCharacterEntry } from "@/lib/league-characters";
import type { BattingLine } from "@/lib/game-stats-queries";
import { formatRate } from "@/domain/stats/batting-metrics";

type Props = {
  leagueId: string;
  seasonId?: string;
  characters: LeagueCharacterEntry[];
  batting: Map<string, BattingLine>;
  inactive?: boolean;
};

export function CharacterLibraryGrid({
  leagueId,
  seasonId,
  characters,
  batting,
  inactive = false,
}: Props) {
  if (characters.length === 0) return null;

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {characters.map((character) => {
        const line = batting.get(character.gameCharId);
        const href = `/leagues/${leagueId}/characters/${encodeURIComponent(character.gameCharId)}${seasonId ? `?season=${seasonId}` : ""}`;

        return (
          <Link
            key={character.gameCharId}
            href={href}
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
              inactive
                ? "border-zinc-900 bg-zinc-950/30 opacity-60 hover:border-zinc-700 hover:opacity-80"
                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
            }`}
          >
            <CharacterMugshot charId={character.gameCharId} size={48} />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">{character.displayName}</p>
              <p className="font-mono text-xs text-zinc-600">{character.gameCharId}</p>
              {character.leagueCopies > 1 ? (
                <p className="text-xs text-zinc-500">{character.leagueCopies} league copies</p>
              ) : null}
              <p className="mt-1 text-xs text-zinc-400">
                {line
                  ? `${line.games}G · ${formatRate(line.ba)} · ${line.hr} HR · ${line.rbi} RBI`
                  : "0G · — · 0 HR · 0 RBI"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
