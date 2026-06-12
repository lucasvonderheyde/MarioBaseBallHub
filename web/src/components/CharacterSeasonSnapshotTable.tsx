import Link from "next/link";
import { CharacterLink } from "@/components/CharacterLink";
import {
  earnedRunAverage,
  formatEra,
  formatRate,
  inningsPitched,
} from "@/domain/stats/batting-metrics";
import type { BattingLine, PitchingLine } from "@/lib/game-stats-queries";
import type { CharacterLibrarySort } from "@/lib/sort-character-library";

type SnapshotCharacter = {
  gameCharId: string;
  displayName: string;
};

type Props = {
  characters: SnapshotCharacter[];
  batting: Map<string, BattingLine>;
  pitching: Map<string, PitchingLine>;
  leagueId: string;
  seasonId?: string;
  sort: CharacterLibrarySort;
  sortHref: (sort: CharacterLibrarySort) => string;
};

const SORTABLE_HEADERS: { key: CharacterLibrarySort; label: string }[] = [
  { key: "games", label: "G" },
  { key: "avg", label: "AVG" },
  { key: "obp", label: "OBP" },
  { key: "hr", label: "HR" },
  { key: "rbi", label: "RBI" },
];

function sortableHeader(
  current: CharacterLibrarySort,
  key: CharacterLibrarySort,
  label: string,
  href: string,
) {
  const isActive = current === key;
  return (
    <th key={key} className="py-2 pr-2">
      <Link
        href={href}
        className={isActive ? "text-amber-300" : "hover:text-zinc-300"}
      >
        {label}
        {isActive ? " ↓" : ""}
      </Link>
    </th>
  );
}

/** One-row-per-character season summary: batting plus core pitching. */
export function CharacterSeasonSnapshotTable({
  characters,
  batting,
  pitching,
  leagueId,
  seasonId,
  sort,
  sortHref,
}: Props) {
  const headerByKey = new Map(SORTABLE_HEADERS.map((h) => [h.key, h]));

  return (
    <div className="msb-table-wrap mt-3">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500">
            <th className="py-2 pr-2">
              <Link
                href={sortHref("name")}
                className={sort === "name" ? "text-amber-300" : "hover:text-zinc-300"}
              >
                Character
              </Link>
            </th>
            {sortableHeader(sort, "games", headerByKey.get("games")!.label, sortHref("games"))}
            <th className="py-2 pr-2">AB</th>
            <th className="py-2 pr-2">H</th>
            {sortableHeader(sort, "avg", "AVG", sortHref("avg"))}
            {sortableHeader(sort, "obp", "OBP", sortHref("obp"))}
            <th className="py-2 pr-2">SLG</th>
            {sortableHeader(sort, "hr", "HR", sortHref("hr"))}
            {sortableHeader(sort, "rbi", "RBI", sortHref("rbi"))}
            <th className="py-2 pr-2">BB</th>
            <th className="py-2 pl-3 pr-2 border-l border-zinc-800">IP</th>
            <th className="py-2 pr-2">ERA</th>
            <th className="py-2 pr-2">K (P)</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((character) => {
            const bat = batting.get(character.gameCharId);
            const pitch = pitching.get(character.gameCharId);
            const era = pitch
              ? formatEra(earnedRunAverage(pitch.earnedRuns, pitch.outsPitched))
              : "—";
            return (
              <tr key={character.gameCharId} className="border-b border-zinc-900">
                <td className="py-1.5 pr-2">
                  <CharacterLink
                    charId={character.gameCharId}
                    displayName={character.displayName}
                    leagueId={leagueId}
                    seasonId={seasonId}
                    iconSize={22}
                  />
                </td>
                <td className="py-1.5 pr-2 tabular-nums">{bat?.games ?? 0}</td>
                <td className="py-1.5 pr-2 tabular-nums">{bat?.ab ?? 0}</td>
                <td className="py-1.5 pr-2 tabular-nums">{bat?.hits ?? 0}</td>
                <td className="py-1.5 pr-2 tabular-nums">{formatRate(bat?.ba ?? null)}</td>
                <td className="py-1.5 pr-2 tabular-nums">{formatRate(bat?.obp ?? null)}</td>
                <td className="py-1.5 pr-2 tabular-nums">{formatRate(bat?.slg ?? null)}</td>
                <td className="py-1.5 pr-2 tabular-nums">{bat?.hr ?? 0}</td>
                <td className="py-1.5 pr-2 tabular-nums">{bat?.rbi ?? 0}</td>
                <td className="py-1.5 pr-2 tabular-nums">
                  {(bat?.walks4ball ?? 0) + (bat?.walksHbp ?? 0)}
                </td>
                <td className="py-1.5 pl-3 pr-2 tabular-nums border-l border-zinc-900">
                  {pitch ? inningsPitched(pitch.outsPitched) : "0.0"}
                </td>
                <td className="py-1.5 pr-2 tabular-nums">{era}</td>
                <td className="py-1.5 pr-2 tabular-nums">{pitch?.strikeouts ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
