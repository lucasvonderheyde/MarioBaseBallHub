import Link from "next/link";
import { CharacterIcon } from "@/components/CharacterIcon";
import { Card } from "@/components/ui/Card";
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
    <Card
      title="Season records"
      action={
        compact && records.length > 0 ? (
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}/records`}
            className="msb-link shrink-0 text-xs"
          >
            All records →
          </Link>
        ) : undefined
      }
    >
      {!compact ? (
        <p className="-mt-2 mb-4 text-sm text-zinc-500">
          Single-game highs from uploaded box scores.
        </p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((record) => (
            <li
              key={record.id}
              className="rounded-lg border border-zinc-800/80 bg-zinc-950/30 p-4"
            >
              <p className="msb-card-title">{record.title}</p>
              <p className="mt-2 text-2xl font-medium tabular-nums text-zinc-50">
                {record.valueLabel}
              </p>
              <p className="mt-1 text-sm text-zinc-400">{record.detail}</p>
              {record.charId ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                  <CharacterIcon
                    charId={record.charId}
                    displayName={record.charDisplayName}
                    size={22}
                    className="rounded-full"
                  />
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
                className="msb-link mt-2 inline-block text-xs"
              >
                Box score →
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="msb-empty-state">
          <p className="text-sm text-zinc-500">No records yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Upload a few games to start tracking single-game highs
          </p>
        </div>
      )}
    </Card>
  );
}
