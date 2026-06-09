import Link from "next/link";

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
};

export function ChampionshipOddsPanel({
  leagueId,
  seasonId,
  teams,
  gamesPlayed,
}: Props) {
  const sorted = [...teams].sort((a, b) => b.odds - a.odds);
  const leader = sorted[0];

  return (
    <section className="mt-8 msb-panel p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Championship odds</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Projected title chances from roster ratings, chemistry, and season results.
        {gamesPlayed === 0
          ? " Preseason projection — updates every week as games are reported."
          : ` Based on ${gamesPlayed} reported game${gamesPlayed === 1 ? "" : "s"} so far.`}
      </p>

      {leader ? (
        <p className="mt-3 text-sm text-zinc-300">
          Current favorite:{" "}
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${leader.teamId}`}
            className="font-medium text-amber-400 hover:underline"
          >
            {leader.name}
          </Link>{" "}
          ({Math.round(leader.odds * 100)}%)
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        {sorted.map((row) => (
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
    </section>
  );
}
