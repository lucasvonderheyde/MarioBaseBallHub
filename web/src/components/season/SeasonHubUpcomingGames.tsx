import Link from "next/link";
import {
  ScheduleGameCard,
  type ScheduleGameDisplay,
  type ScheduleTeamDisplay,
} from "@/components/league-schedule-ui";
import { canUserReportGame, type LeagueRole } from "@/lib/game-report-access";
import { scheduleRoundHeading } from "@/lib/schedule-labels";
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
  role: LeagueRole | null;
  isAdmin: boolean;
};

export function SeasonHubUpcomingGames({
  leagueId,
  seasonId,
  phase,
  upcoming,
  teams,
  userId,
  role,
  isAdmin,
}: Props) {
  function teamEntry(teamId: string) {
    return teams.find((entry) => entry.team.id === teamId);
  }

  const title =
    phase === "playoffs" ? "Upcoming playoff games" : "Upcoming games";
  const subtitle =
    phase === "playoffs"
      ? "Next playoff matchups on the schedule. Propose times or report results from each card."
      : "Your next games to play. Propose times from each card — when both managers agree, it is announced in the activity feed.";

  return (
    <section className="mt-8 msb-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>
        <Link
          href={`/leagues/${leagueId}/schedule`}
          className="text-sm text-amber-400 hover:underline"
        >
          Full schedule →
        </Link>
      </div>

      {upcoming.length > 0 ? (
        <ul className="msb-schedule-grid mt-4">
          {upcoming.map(({ game, round }) => {
            const home = teamEntry(game.homeTeamId);
            const away = teamEntry(game.awayTeamId);
            const canReport = canUserReportGame(
              userId,
              role,
              home?.manager?.id,
              away?.manager?.id,
            );
            const roundLabel = `${scheduleRoundHeading(round.phase, round.roundNumber)} · Slot ${game.slotInRound}`;

            return (
              <ScheduleGameCard
                key={game.id}
                leagueId={leagueId}
                seasonId={seasonId}
                game={game}
                awayName={away?.team.name ?? "?"}
                homeName={home?.team.name ?? "?"}
                canReport={canReport}
                isAdmin={isAdmin}
                userId={userId}
                homeManagerUserId={home?.manager?.id ?? null}
                awayManagerUserId={away?.manager?.id ?? null}
                roundLabel={roundLabel}
              />
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          {phase === "playoffs"
            ? "No upcoming playoff games scheduled."
            : "No upcoming regular-season games left."}
        </p>
      )}
    </section>
  );
}
