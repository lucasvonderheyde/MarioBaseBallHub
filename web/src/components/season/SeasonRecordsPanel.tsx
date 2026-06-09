import Link from "next/link";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import type { SeasonRecordHolder } from "@/lib/season-records";

type Props = {
  leagueId: string;
  seasonId: string;
  records: SeasonRecordHolder[];
  compact?: boolean;
};

function managerLabel(record: SeasonRecordHolder): string | null {
  return record.managerDisplayName ?? record.managerUsername ?? null;
}

export function SeasonRecordsPanel({
  leagueId,
  seasonId,
  records,
  compact = false,
}: Props) {
  const visible = compact ? records.slice(0, 6) : records;

  return (
    <section className="mt-8 msb-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Season records</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Single-game highs from uploaded box scores.
          </p>
        </div>
        {compact && records.length > 0 ? (
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}/records`}
            className="text-sm text-amber-400 hover:underline"
          >
            All records →
          </Link>
        ) : null}
      </div>

      {visible.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((record) => (
            <li
              key={record.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {record.title}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-300">
                {record.valueLabel}
              </p>
              <p className="mt-1 text-sm text-zinc-300">{record.detail}</p>
              {record.charId ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                  <CharacterMugshot charId={record.charId} size={22} />
                  {record.charDisplayName}
                </p>
              ) : null}
              {managerLabel(record) ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {record.teamName ? `${record.teamName} · ` : ""}
                  {managerLabel(record)}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-zinc-500">{record.matchup}</p>
              <Link
                href={`/leagues/${leagueId}/seasons/${seasonId}/games/${record.gameId}`}
                className="mt-2 inline-block text-xs text-amber-400 hover:underline"
              >
                Box score →
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          No records yet. Upload a few games to start tracking single-game highs.
        </p>
      )}
    </section>
  );
}
