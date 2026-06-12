import Link from "next/link";
import type { HeadToHeadComparison } from "@/lib/head-to-head";

type Props = {
  comparison: HeadToHeadComparison;
};

function managerName(manager: {
  displayName: string | null;
  username: string;
}): string {
  return manager.displayName ?? manager.username;
}

export function HeadToHeadComparisonView({ comparison }: Props) {
  const { managerA, managerB } = comparison;

  return (
    <div className="mt-8 space-y-8">
      <section className="msb-panel p-4 sm:p-6">
        <p className="text-sm text-zinc-500">{comparison.scopeLabel}</p>
        <h2 className="mt-1 text-xl font-semibold">
          {managerName(managerA)}{" "}
          <span className="font-normal text-zinc-500">vs</span>{" "}
          {managerName(managerB)}
        </h2>

        {comparison.games > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Record</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {comparison.managerAWins}–{comparison.managerBWins}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {managerName(managerA)} wins – {managerName(managerB)} wins
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Runs</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {comparison.managerARuns}–{comparison.managerBRuns}
              </p>
              <p className="mt-1 text-xs text-zinc-500">scored in these matchups</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Games</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {comparison.games}
              </p>
              <p className="mt-1 text-xs text-zinc-500">completed meetings</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            These managers have not played each other in this scope yet.
          </p>
        )}

        {comparison.breakdown ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Seasons</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {comparison.breakdown.league.managerAWins}–
                {comparison.breakdown.league.managerBWins}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {comparison.breakdown.league.managerARuns}–
                {comparison.breakdown.league.managerBRuns} runs ·{" "}
                {comparison.breakdown.league.games} game
                {comparison.breakdown.league.games === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Friendlies</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {comparison.breakdown.friendly.managerAWins}–
                {comparison.breakdown.friendly.managerBWins}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {comparison.breakdown.friendly.managerARuns}–
                {comparison.breakdown.friendly.managerBRuns} runs ·{" "}
                {comparison.breakdown.friendly.games} game
                {comparison.breakdown.friendly.games === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {comparison.recentGames.length > 0 ? (
        <section className="msb-panel p-4 sm:p-6">
          <h3 className="text-lg font-semibold">Game log</h3>
          <ul className="mt-3 space-y-2">
            {comparison.recentGames.map((game) => (
              <li
                key={`${game.source}-${game.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm"
              >
                <span className="text-zinc-500">
                  {game.playedAt?.toLocaleDateString() ?? "—"}
                </span>
                <span
                  className={
                    game.managerAWon
                      ? "font-medium text-emerald-300"
                      : "text-zinc-300"
                  }
                >
                  {game.label}
                </span>
                <span className="text-xs text-zinc-600">
                  {game.source === "friendly" ? "Friendly" : game.seasonName ?? "League"}
                </span>
                {game.source === "league" && game.leagueId && game.seasonId ? (
                  <Link
                    href={`/leagues/${game.leagueId}/seasons/${game.seasonId}/games/${game.id}`}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Box score
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
