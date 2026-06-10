import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatWinPct } from "@/domain/odds/game-win-probability";
import type { ScheduleGameDisplay, ScheduleTeamDisplay } from "@/components/league-schedule-ui";
import { isUserGameParticipant } from "@/lib/game-report-access";
import { scheduleRoundShortLabel } from "@/lib/schedule-labels";
import type { ScheduleRoundPhase } from "@/lib/upcoming-schedule-games";

type UpcomingEntry = {
  game: ScheduleGameDisplay;
  round: { phase: ScheduleRoundPhase; roundNumber: number };
};

type Props = {
  leagueId: string;
  seasonId: string;
  phase: ScheduleRoundPhase;
  upcoming: UpcomingEntry[];
  teams: ScheduleTeamDisplay[];
  userId: string;
  gameOdds?: Map<string, { homeWinPct: number; awayWinPct: number }>;
};

export function SeasonHubUpcomingGames({
  leagueId,
  seasonId,
  phase,
  upcoming,
  teams,
  userId,
  gameOdds,
}: Props) {
  function teamEntry(teamId: string) {
    return teams.find((entry) => entry.team.id === teamId);
  }

  function teamName(teamId: string): string {
    return teamEntry(teamId)?.team.name ?? "?";
  }

  const title = phase === "playoffs" ? "Upcoming playoff games" : "Upcoming games";

  return (
    <Card
      title={title}
      action={
        <Link
          href={`/leagues/${leagueId}/schedule`}
          className="msb-link shrink-0 text-xs"
        >
          Full schedule →
        </Link>
      }
    >
      {upcoming.length > 0 ? (
        <ul>
          {upcoming.map(({ game, round }) => {
            const away = teamName(game.awayTeamId);
            const home = teamName(game.homeTeamId);
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
                className="msb-row-divider flex flex-wrap items-center gap-x-3 gap-y-2 py-3 text-sm"
              >
                <span className="min-w-0 flex-1 text-zinc-200">
                  {away}
                  <span className="text-zinc-600"> vs </span>
                  {home}
                </span>
                <span className="msb-badge-muted">
                  {scheduleRoundShortLabel(round.phase, round.roundNumber)}
                </span>
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
        <div className="msb-empty-state">
          <p className="text-sm text-zinc-500">
            {phase === "playoffs"
              ? "No upcoming playoff games"
              : "No upcoming games this round"}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Check the full schedule for later matchups
          </p>
        </div>
      )}
    </Card>
  );
}
