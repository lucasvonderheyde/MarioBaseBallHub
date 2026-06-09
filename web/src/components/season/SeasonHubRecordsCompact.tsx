import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { SeasonRecordHolder } from "@/lib/season-records";

type Props = {
  leagueId: string;
  seasonId: string;
  records: SeasonRecordHolder[];
};

function holderName(record: SeasonRecordHolder): string {
  return (
    record.charDisplayName ??
    record.teamName ??
    record.managerDisplayName ??
    record.managerUsername ??
    "—"
  );
}

export function SeasonHubRecordsCompact({ leagueId, seasonId, records }: Props) {
  return (
    <Card
      title="Season records"
      action={
        records.length > 0 ? (
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}/records`}
            className="msb-link shrink-0 text-xs"
          >
            All records →
          </Link>
        ) : null
      }
    >
      {records.length > 0 ? (
        <ul>
          {records.map((record) => (
            <li
              key={record.id}
              className="msb-row-divider flex items-center gap-3 py-3 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-zinc-400">
                {record.title}
              </span>
              <span className="shrink-0 text-xl font-medium tabular-nums text-zinc-50">
                {record.valueLabel}
              </span>
              <span className="w-28 shrink-0 truncate text-right text-sm text-zinc-500">
                {holderName(record)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="msb-empty-state">
          <p className="text-sm text-zinc-500">No records yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Upload a few games to start tracking highs
          </p>
        </div>
      )}
    </Card>
  );
}
