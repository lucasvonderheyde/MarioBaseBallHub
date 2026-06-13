import type { ReactNode } from "react";
import Link from "next/link";
import {
  gameWinnerSide,
  winnerScoreClass,
  winnerTeamNameClass,
} from "@/components/games/GameMatchupScore";
import { formatWinPct } from "@/domain/odds/game-win-probability";
import {
  scheduleGameCardStatus,
  scheduleStatusBadgeClass,
  scheduleStatusLabel,
} from "@/lib/schedule-display";
import { scheduleRoundShortLabel } from "@/lib/schedule-labels";
import type { ScheduleGameDisplay } from "@/components/league-schedule-ui";
import type { ScheduleRoundPhase } from "@/lib/upcoming-schedule-games";

type PlayedGameRow = {
  game: {
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number | null;
    awayScore: number | null;
    playedAt: Date | null;
    statsRawJson: string | null;
    agreedPlayAt: Date | null;
  };
  round: { phase: "regular" | "playoffs"; roundNumber: number };
};

type UpcomingEntry = {
  game: ScheduleGameDisplay;
  round: { phase: ScheduleRoundPhase; roundNumber: number };
};

type Props = {
  leagueId: string;
  seasonId: string;
  games: PlayedGameRow[];
  upcoming: UpcomingEntry[];
  teamNames: Map<string, string>;
  gameOdds?: Map<string, { homeWinPct: number; awayWinPct: number }>;
  recentLimit?: number;
  upcomingLimit?: number;
};

function ScoreboardCardShell({
  children,
  href,
  status,
}: {
  children: ReactNode;
  href: string;
  status: ReturnType<typeof scheduleGameCardStatus>;
}) {
  const borderClass =
    status === "played"
      ? "border-zinc-800/80 bg-zinc-950/50 hover:border-zinc-700"
      : status === "time_agreed"
        ? "border-sky-900/40 bg-sky-950/15 hover:border-sky-800/60"
        : "border-amber-900/35 bg-amber-950/10 hover:border-amber-800/50";

  return (
    <Link
      href={href}
      className={`flex min-h-[7.5rem] flex-col rounded-lg border p-3 transition ${borderClass}`}
    >
      {children}
    </Link>
  );
}

function TeamScoreLine({
  name,
  score,
  side,
  winner,
}: {
  name: string;
  score?: number | null;
  side: "away" | "home";
  winner: ReturnType<typeof gameWinnerSide> | null;
}) {
  const nameClass = winner
    ? winnerTeamNameClass(side, winner)
    : "text-zinc-200";
  const scoreClass = winner && score != null
    ? winnerScoreClass(side, winner)
    : "text-zinc-400";

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className={`min-w-0 truncate ${nameClass}`}>{name}</span>
      {score != null ? (
        <span className={`shrink-0 text-base font-semibold tabular-nums ${scoreClass}`}>
          {score}
        </span>
      ) : null}
    </div>
  );
}

export function SeasonScoreboard({
  leagueId,
  seasonId,
  games,
  upcoming,
  teamNames,
  gameOdds,
  recentLimit = 4,
  upcomingLimit = 4,
}: Props) {
  const recent = games
    .filter(
      ({ game }) =>
        game.playedAt != null &&
        game.homeScore != null &&
        game.awayScore != null &&
        game.statsRawJson,
    )
    .sort(
      (a, b) => (b.game.playedAt?.getTime() ?? 0) - (a.game.playedAt?.getTime() ?? 0),
    )
    .slice(0, recentLimit);

  const scoreboardEntries: Array<
    | { kind: "played"; row: PlayedGameRow }
    | { kind: "upcoming"; entry: UpcomingEntry }
  > = [
    ...recent.map((row) => ({ kind: "played" as const, row })),
    ...upcoming.slice(0, upcomingLimit).map((entry) => ({
      kind: "upcoming" as const,
      entry,
    })),
  ];

  const gameHref = (gameId: string) =>
    `/leagues/${leagueId}/seasons/${seasonId}/games/${gameId}`;

  return (
    <section className="msb-panel overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
          Scoreboard
        </h2>
        <div className="flex gap-3 text-xs">
          <Link
            href={`/leagues/${leagueId}/schedule`}
            className="msb-link font-medium"
          >
            Full schedule
          </Link>
          <Link
            href={`/leagues/${leagueId}/standings?season=${seasonId}`}
            className="msb-link font-medium"
          >
            Standings
          </Link>
        </div>
      </div>

      {scoreboardEntries.length > 0 ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          {scoreboardEntries.map((item) => {
            if (item.kind === "played") {
              const { game, round } = item.row;
              const away = teamNames.get(game.awayTeamId) ?? "?";
              const home = teamNames.get(game.homeTeamId) ?? "?";
              const awayScore = game.awayScore!;
              const homeScore = game.homeScore!;
              const winner = gameWinnerSide(awayScore, homeScore);
              const status = scheduleGameCardStatus(game);

              return (
                <ScoreboardCardShell
                  key={game.id}
                  href={gameHref(game.id)}
                  status={status}
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {scheduleRoundShortLabel(round.phase, round.roundNumber)}
                  </p>
                  <div className="space-y-1.5">
                    <TeamScoreLine
                      name={away}
                      score={awayScore}
                      side="away"
                      winner={winner}
                    />
                    <TeamScoreLine
                      name={home}
                      score={homeScore}
                      side="home"
                      winner={winner}
                    />
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className={scheduleStatusBadgeClass(status)}>
                      {scheduleStatusLabel(status)}
                    </span>
                    <span className="text-xs font-medium text-msb-gold-bright">
                      Box score →
                    </span>
                  </div>
                </ScoreboardCardShell>
              );
            }

            const { game, round } = item.entry;
            const away = teamNames.get(game.awayTeamId) ?? "?";
            const home = teamNames.get(game.homeTeamId) ?? "?";
            const status = scheduleGameCardStatus(game);
            const odds = gameOdds?.get(game.id);

            return (
              <ScoreboardCardShell
                key={game.id}
                href={gameHref(game.id)}
                status={status}
              >
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {scheduleRoundShortLabel(round.phase, round.roundNumber)}
                </p>
                <div className="space-y-1">
                  <p className="truncate text-sm text-zinc-200">{away}</p>
                  <p className="text-xs text-zinc-500">@</p>
                  <p className="truncate text-sm text-zinc-200">{home}</p>
                </div>
                {odds ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    {formatWinPct(odds.awayWinPct)} – {formatWinPct(odds.homeWinPct)}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  <span className={scheduleStatusBadgeClass(status)}>
                    {status === "time_agreed" && game.agreedPlayAt
                      ? game.agreedPlayAt.toLocaleString(undefined, {
                          weekday: "short",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : scheduleStatusLabel(status)}
                  </span>
                  <span className="text-xs font-medium text-msb-gold-bright">
                    View →
                  </span>
                </div>
              </ScoreboardCardShell>
            );
          })}
        </div>
      ) : (
        <div className="msb-empty-state px-4 py-10 sm:px-5">
          <p className="text-sm text-zinc-500">No games on the board yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Schedule matchups or report results to populate the scoreboard
          </p>
        </div>
      )}
    </section>
  );
}
