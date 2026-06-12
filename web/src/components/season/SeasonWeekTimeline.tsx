import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  gameWinnerSide,
  GameScoreInline,
  winnerTeamNameClass,
} from "@/components/games/GameMatchupScore";
import { formatWinPct } from "@/domain/odds/game-win-probability";
import { isUserGameParticipant } from "@/lib/game-report-access";
import { scheduleRoundShortLabel } from "@/lib/schedule-labels";
import type { ScheduleGameDisplay, ScheduleTeamDisplay } from "@/components/league-schedule-ui";
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
  teams: ScheduleTeamDisplay[];
  teamNames: Map<string, string>;
  userId: string;
  userTeamId?: string | null;
  gameOdds?: Map<string, { homeWinPct: number; awayWinPct: number }>;
  recentLimit?: number;
};

function userResultBadge(
  userTeamId: string | null | undefined,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
): "W" | "L" | null {
  if (!userTeamId) return null;
  if (userTeamId !== homeTeamId && userTeamId !== awayTeamId) return null;
  if (homeScore === awayScore) return null;
  const userIsHome = userTeamId === homeTeamId;
  const userWon =
    (userIsHome && homeScore > awayScore) || (!userIsHome && awayScore > homeScore);
  return userWon ? "W" : "L";
}

/** Single season timeline: latest results on top, scheduled games below. */
export function SeasonWeekTimeline({
  leagueId,
  seasonId,
  games,
  upcoming,
  teams,
  teamNames,
  userId,
  userTeamId,
  gameOdds,
  recentLimit = 5,
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

  function teamEntry(teamId: string) {
    return teams.find((entry) => entry.team.id === teamId);
  }

  return (
    <Card
      title="This week"
      action={
        <Link
          href={`/leagues/${leagueId}/schedule`}
          className="msb-link shrink-0 text-xs"
        >
          Full schedule →
        </Link>
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Latest results
      </p>
      {recent.length > 0 ? (
        <ul>
          {recent.map(({ game, round }) => {
            const away = teamNames.get(game.awayTeamId) ?? "?";
            const home = teamNames.get(game.homeTeamId) ?? "?";
            const awayScore = game.awayScore!;
            const homeScore = game.homeScore!;
            const winner = gameWinnerSide(awayScore, homeScore);
            const result = userResultBadge(
              userTeamId,
              game.homeTeamId,
              game.awayTeamId,
              homeScore,
              awayScore,
            );
            return (
              <li
                key={game.id}
                className="msb-row-divider flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
              >
                <span className="w-14 shrink-0 text-xs text-zinc-500">
                  {game.playedAt?.toLocaleDateString(undefined, {
                    month: "numeric",
                    day: "numeric",
                  }) ?? "—"}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className={winnerTeamNameClass("away", winner)}>{away}</span>
                  <span className="text-zinc-600"> vs </span>
                  <span className={winnerTeamNameClass("home", winner)}>{home}</span>
                </span>
                <GameScoreInline awayScore={awayScore} homeScore={homeScore} />
                {result ? (
                  <span className={result === "W" ? "msb-badge-win" : "msb-badge-loss"}>
                    {result}
                  </span>
                ) : null}
                <span className="msb-badge-muted">
                  {scheduleRoundShortLabel(round.phase, round.roundNumber)}
                </span>
                <Link
                  href={`/leagues/${leagueId}/seasons/${seasonId}/games/${game.id}`}
                  className="msb-link text-xs"
                >
                  Box score
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-3 text-sm text-zinc-500">No games played yet.</p>
      )}

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Coming up
      </p>
      {upcoming.length > 0 ? (
        <ul>
          {upcoming.map(({ game, round }) => {
            const away = teamNames.get(game.awayTeamId) ?? "?";
            const home = teamNames.get(game.homeTeamId) ?? "?";
            const homeEntry = teamEntry(game.homeTeamId);
            const awayEntry = teamEntry(game.awayTeamId);
            const gameHref = `/leagues/${leagueId}/seasons/${seasonId}/games/${game.id}`;
            const canProposeTime =
              !game.agreedPlayAt &&
              isUserGameParticipant(
                userId,
                homeEntry?.manager?.id ?? null,
                awayEntry?.manager?.id ?? null,
              );
            return (
              <li
                key={game.id}
                className="msb-row-divider flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-zinc-200">
                  {away}
                  <span className="text-zinc-600"> vs </span>
                  {home}
                </span>
                <span className="msb-badge-muted">
                  {scheduleRoundShortLabel(round.phase, round.roundNumber)}
                </span>
                {game.agreedPlayAt ? (
                  <span className="rounded-md border border-sky-700/50 bg-sky-950/40 px-2 py-0.5 text-xs text-sky-300">
                    {game.agreedPlayAt.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                ) : (
                  <span className="rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-xs text-amber-300">
                    Needs scheduling
                  </span>
                )}
                {gameOdds?.get(game.id) ? (
                  <span className="msb-badge-muted tabular-nums">
                    {formatWinPct(gameOdds.get(game.id)!.awayWinPct)} ·{" "}
                    {formatWinPct(gameOdds.get(game.id)!.homeWinPct)}
                  </span>
                ) : null}
                {canProposeTime ? (
                  <Link href={gameHref} className="msb-btn-outline-gold">
                    Propose time
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-3 text-sm text-zinc-500">
          No upcoming games this round — check the full schedule.
        </p>
      )}
    </Card>
  );
}
