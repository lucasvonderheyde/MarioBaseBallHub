import Link from "next/link";
import type { PlayoffGameView } from "@/domain/playoffs/build-playoff-picture";
import { GameStatsUploader } from "@/components/GameStatsUploader";
import { scheduleRoundHeading } from "@/lib/schedule-labels";
import { canUserReportGame, type LeagueRole } from "@/lib/game-report-access";
import { clearGameStatsAction } from "@/server/actions";

export type ScheduleRoundDisplay = {
  id: string;
  phase: "regular" | "playoffs";
  roundNumber: number;
};

export type ScheduleGameDisplay = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  playedAt: Date | null;
  slotInRound: number;
  statsGameId: string | null;
  statsRawJson: string | null;
  youtubeUrl: string | null;
};

export type ScheduleTeamDisplay = {
  team: { id: string; name: string };
  manager?: { id: string } | null;
};

type ScheduleGameCardProps = {
  leagueId: string;
  seasonId: string;
  game: ScheduleGameDisplay;
  awayName: string;
  homeName: string;
  canReport: boolean;
  isAdmin: boolean;
};

function hasFinalScore(game: ScheduleGameDisplay): boolean {
  return game.homeScore != null && game.awayScore != null;
}

type ScheduleGameCardStatus = "played" | "scheduled";

function scheduleGameCardStatus(game: ScheduleGameDisplay): ScheduleGameCardStatus {
  if (hasFinalScore(game) || game.statsRawJson) return "played";
  return "scheduled";
}

function scheduleGameCardClass(status: ScheduleGameCardStatus): string {
  const base = "flex min-h-full flex-col overflow-hidden rounded-lg border";
  if (status === "played") {
    return `${base} border-zinc-900 bg-zinc-950/80`;
  }
  return `${base} border-msb-grass/45 bg-emerald-950/20`;
}

function GameScoreDisplay({
  awayName,
  homeName,
  awayScore,
  homeScore,
}: {
  awayName: string;
  homeName: string;
  awayScore: number;
  homeScore: number;
}) {
  const awayWins = awayScore > homeScore;
  const homeWins = homeScore > awayScore;

  const awayNameClass = awayWins
    ? "font-semibold text-amber-400"
    : homeWins
      ? "text-zinc-500"
      : "text-zinc-300";
  const homeNameClass = homeWins
    ? "font-semibold text-amber-400"
    : awayWins
      ? "text-zinc-500"
      : "text-zinc-300";
  const awayScoreClass = awayWins ? "text-amber-400" : "text-zinc-400";
  const homeScoreClass = homeWins ? "text-amber-400" : "text-zinc-400";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 rounded-md border border-zinc-700/80 bg-zinc-950/60 px-3 py-2.5 tabular-nums">
      <span className={`truncate text-sm ${awayNameClass}`}>{awayName}</span>
      <span className="flex shrink-0 items-baseline gap-1.5 text-lg font-semibold leading-none">
        <span className={awayScoreClass}>{awayScore}</span>
        <span className="text-sm font-normal text-zinc-600">–</span>
        <span className={homeScoreClass}>{homeScore}</span>
      </span>
      <span className={`truncate text-right text-sm ${homeNameClass}`}>{homeName}</span>
    </div>
  );
}

export function ScheduleGameCard({
  leagueId,
  seasonId,
  game,
  awayName,
  homeName,
  canReport,
  isAdmin,
}: ScheduleGameCardProps) {
  const gameHref = `/leagues/${leagueId}/seasons/${seasonId}/games/${game.id}`;
  const finalScore = hasFinalScore(game);
  const cardStatus = scheduleGameCardStatus(game);
  const viewLabel = game.statsRawJson ? "Box score & video" : "View game";
  const showReportForm = canReport && !finalScore && !game.statsRawJson;

  return (
    <li className={scheduleGameCardClass(cardStatus)}>
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        {finalScore ? (
          <Link href={gameHref} className="block hover:opacity-90">
            <GameScoreDisplay
              awayName={awayName}
              homeName={homeName}
              awayScore={game.awayScore!}
              homeScore={game.homeScore!}
            />
          </Link>
        ) : (
          <>
            <h3 className="text-base font-semibold leading-snug sm:text-lg">
              <Link href={gameHref} className="text-zinc-100 hover:text-amber-400">
                {awayName}
                <span className="mx-1.5 font-normal text-zinc-500">@</span>
                {homeName}
              </Link>
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-md border border-msb-grass/50 bg-msb-grass/10 px-2.5 py-1 text-msb-grass">
                Scheduled
              </span>
              {game.youtubeUrl && !game.statsRawJson ? (
                <span className="text-xs text-zinc-500">Video linked</span>
              ) : null}
            </div>
          </>
        )}

        {finalScore && game.youtubeUrl && !game.statsRawJson ? (
          <p className="mt-2 text-xs text-zinc-500">Video linked</p>
        ) : null}

        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Slot {game.slotInRound} · Game ID{" "}
          <span className="font-mono">{game.id.slice(0, 8)}…</span>
          {game.statsGameId ? (
            <>
              {" "}
              · Stats <span className="font-mono">{game.statsGameId}</span>
            </>
          ) : null}
        </p>
      </div>

      {showReportForm ? (
        <div className="border-t border-zinc-800/80 bg-zinc-950/40 px-4 py-4 sm:px-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Report result
          </p>
          <GameStatsUploader
            gameId={game.id}
            leagueId={leagueId}
            seasonId={seasonId}
            compact
          />
        </div>
      ) : null}

      {isAdmin && game.statsGameId ? (
        <form
          action={clearGameStatsAction.bind(null, game.id, leagueId, seasonId)}
          className="border-t border-zinc-800/80 px-4 py-2 sm:px-5"
        >
          <button type="submit" className="text-xs text-red-400 hover:underline">
            Clear stats (admin)
          </button>
        </form>
      ) : null}

      <div className="mt-auto border-t border-zinc-800/80 px-4 py-3 sm:px-5">
        <Link href={gameHref} className="msb-btn-nav w-full justify-center">
          {viewLabel}
        </Link>
      </div>
    </li>
  );
}

type SeasonScheduleByRoundProps = {
  leagueId: string;
  seasonId: string;
  rounds: ScheduleRoundDisplay[];
  gamesByRound: Map<string, { game: ScheduleGameDisplay }[]>;
  teams: ScheduleTeamDisplay[];
  userId: string;
  role: LeagueRole | null;
  isAdmin: boolean;
  className?: string;
};

export function SeasonScheduleByRound({
  leagueId,
  seasonId,
  rounds,
  gamesByRound,
  teams,
  userId,
  role,
  isAdmin,
  className = "space-y-8",
}: SeasonScheduleByRoundProps) {
  function teamEntry(teamId: string) {
    return teams.find((t) => t.team.id === teamId);
  }

  if (rounds.length === 0) {
    return <p className="text-sm text-zinc-500">No rounds scheduled yet.</p>;
  }

  return (
    <div className={className}>
      {rounds.map((round) => {
        const roundGames = gamesByRound.get(round.id) ?? [];
        return (
          <section
            key={round.id}
            className="rounded-lg border border-zinc-800/70 bg-zinc-950/20 p-4 sm:p-5"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {scheduleRoundHeading(round.phase, round.roundNumber)}
            </h3>
            {roundGames.length === 0 ? (
              <p className="mt-3 rounded-md border border-red-900/50 bg-red-950/25 px-3 py-2.5 text-sm text-red-300/90">
                No games scheduled this week.
              </p>
            ) : (
              <ul className="msb-schedule-grid mt-4">
                {roundGames.map(({ game }) => {
                  const home = teamEntry(game.homeTeamId);
                  const away = teamEntry(game.awayTeamId);
                  const canReport = canUserReportGame(
                    userId,
                    role,
                    home?.manager?.id,
                    away?.manager?.id,
                  );
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
                    />
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function PlayoffGameCard({
  game,
  leagueId,
  seasonId,
}: {
  game: PlayoffGameView;
  leagueId: string;
  seasonId: string;
}) {
  const gameHref = `/leagues/${leagueId}/seasons/${seasonId}/games/${game.id}`;
  const cardClass = game.played
    ? "rounded-lg border border-zinc-900 bg-zinc-950/80 px-3 py-2 text-sm"
    : "rounded-lg border border-msb-grass/45 bg-emerald-950/20 px-3 py-2 text-sm";

  return (
    <div className={cardClass}>
      <div className="font-medium">
        ({game.slotInRound}) {game.awayName} @ {game.homeName}
      </div>
      <div className="mt-1 text-zinc-400">
        {game.played ? `${game.awayScore}–${game.homeScore}` : "Scheduled"}
      </div>
      {game.statsGameId ? (
        <Link
          href={gameHref}
          className="mt-1 inline-block text-xs text-amber-400 hover:underline"
        >
          Box score
        </Link>
      ) : null}
    </div>
  );
}

export function seasonStatusLabel(status: string): string {
  if (status === "active") return "Current season";
  if (status === "completed") return "Past season";
  return "Setup";
}

export function seasonStatusClass(status: string): string {
  if (status === "active") {
    return "border-amber-700/60 bg-amber-950/30 text-amber-200";
  }
  if (status === "completed") {
    return "border-zinc-800 bg-zinc-950/40 text-zinc-400";
  }
  return "border-zinc-700 bg-zinc-900/40 text-zinc-500";
}
