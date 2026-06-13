import Link from "next/link";
import { Card } from "@/components/ui/Card";

type TeamRow = {
  teamId: string;
  name: string;
  odds: number;
};

type Props = {
  leagueId: string;
  seasonId: string;
  teams: TeamRow[];
  gamesPlayed: number;
  variant?: "full" | "compact";
};

export function ChampionshipOddsPanel({
  leagueId,
  seasonId,
  teams,
  gamesPlayed,
  variant = "full",
}: Props) {
  const sorted = [...teams].sort((a, b) => b.odds - a.odds);
  const leader = sorted[0];
  const compact = variant === "compact";
  const displayTeams = compact ? sorted.slice(0, 6) : sorted;

  return (
    <Card title="Championship odds">
      {!compact ? (
        <p className="text-sm text-zinc-500">
          Projected title chances from roster ratings, chemistry, and season results.
          {gamesPlayed === 0
            ? " Preseason projection — updates every week as games are reported."
            : ` Based on ${gamesPlayed} reported game${gamesPlayed === 1 ? "" : "s"} so far.`}
        </p>
      ) : null}

      {leader ? (
        <p className={`text-sm text-zinc-300 ${compact ? "" : "mt-3"}`}>
          Favorite:{" "}
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${leader.teamId}`}
            className="font-medium text-amber-400 hover:underline"
          >
            {leader.name}
          </Link>{" "}
          ({Math.round(leader.odds * 100)}%)
        </p>
      ) : null}

      <div className={`space-y-2 ${compact ? "mt-3" : "mt-4"}`}>
        {displayTeams.map((row) => (
          <div key={row.teamId} className="flex items-center gap-3 text-sm">
            <Link
              href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${row.teamId}`}
              className="w-36 shrink-0 truncate text-amber-400 hover:underline sm:w-44"
            >
              {row.name}
            </Link>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-400"
                style={{ width: `${Math.max(4, row.odds * 100)}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right tabular-nums text-zinc-400">
              {Math.round(row.odds * 100)}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
