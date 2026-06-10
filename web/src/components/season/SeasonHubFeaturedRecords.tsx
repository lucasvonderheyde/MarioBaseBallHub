import Link from "next/link";
import { CharacterIcon } from "@/components/CharacterIcon";
import { Card } from "@/components/ui/Card";
import type { SeasonRecordHolder } from "@/lib/season-records";

const FEATURED_CATEGORIES = ["most_hr", "most_rbi", "most_hits"] as const;

type Props = {
  leagueId: string;
  seasonId: string;
  records: SeasonRecordHolder[];
};

export function SeasonHubFeaturedRecords({ leagueId, seasonId, records }: Props) {
  const featured = FEATURED_CATEGORIES.map((category) =>
    records.find((record) => record.category === category),
  ).filter((record): record is SeasonRecordHolder => record != null);

  if (featured.length === 0) {
    return (
      <Card title="Season highlights" className="md:col-span-3">
        <div className="msb-empty-state">
          <p className="text-sm text-zinc-500">No records yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Upload games to track single-game highs
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {featured.map((record) => (
        <Card key={record.id}>
          <p className="msb-card-title">{record.title}</p>
          <p className="mt-3 text-4xl font-medium tabular-nums text-zinc-50">
            {record.valueLabel}
          </p>
          <p className="mt-2 text-sm text-zinc-400">{record.detail}</p>
          {record.charId ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
              <CharacterIcon
                charId={record.charId}
                displayName={record.charDisplayName}
                size={28}
                className="rounded-full"
              />
              <span>{record.charDisplayName}</span>
            </div>
          ) : null}
          <p className="mt-1 text-xs text-zinc-500">{record.matchup}</p>
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}/games/${record.gameId}`}
            className="msb-link mt-4 inline-block text-xs"
          >
            Box score →
          </Link>
        </Card>
      ))}
    </>
  );
}
