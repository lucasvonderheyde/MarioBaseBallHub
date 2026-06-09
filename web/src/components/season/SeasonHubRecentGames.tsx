import Link from "next/link";
import { scheduleRoundShortLabel } from "@/lib/schedule-labels";

type GameRow = {
  game: {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number | null;
    awayScore: number | null;
    playedAt: Date | null;
    statsRawJson: string | null;
  };
  round: { phase: "regular" | "playoffs"; roundNumber: number };
};

type Props = {
  leagueId: string;
  seasonId: string;
  games: GameRow[];
  teamNames: Map<string, string>;
  limit?: number;
};

export function SeasonHubRecentGames({
  leagueId,
  seasonId,
  games,
  teamNames,
  limit = 10,
}: Props) {
  const recent = games
    .filter(
      ({ game }) =>
        game.playedAt != null &&
        game.homeScore != null &&
        game.awayScore != null &&
        game.statsRawJson,
    )
    .sort((a, b) => (b.game.playedAt?.getTime() ?? 0) - (a.game.playedAt?.getTime() ?? 0))
    .slice(0, limit);

  return (
    <section className="mt-8 msb-panel p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Recent results</h2>
      {recent.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {recent.map(({ game, round }) => {
            const away = teamNames.get(game.awayTeamId) ?? "?";
            const home = teamNames.get(game.homeTeamId) ?? "?";
            return (
              <li
                key={game.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm"
              >
                <span className="text-zinc-500">
                  {game.playedAt?.toLocaleDateString() ?? "—"}
                </span>
                <span className="font-medium">
                  {away} {game.awayScore}–{game.homeScore} {home}
                </span>
                <span className="text-xs text-zinc-600">
                  {scheduleRoundShortLabel(round.phase, round.roundNumber)}
                </span>
                <Link
                  href={`/leagues/${leagueId}/seasons/${seasonId}/games/${game.id}`}
                  className="text-amber-400 hover:underline"
                >
                  Box score
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">No completed games with stats yet.</p>
      )}
    </section>
  );
}
