import Link from "next/link";
import type { PlayoffGameView } from "@/domain/playoffs/build-playoff-picture";
import { UploadStatsForm } from "@/components/UploadStatsForm";
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
  const played = game.playedAt != null;

  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={gameHref} className="font-medium hover:text-amber-400">
          {awayName} @ {homeName}
        </Link>
        {played ? (
          <span className="text-zinc-400">
            {game.awayScore}-{game.homeScore} (away-home)
          </span>
        ) : (
          <span className="text-zinc-500">Not played</span>
        )}
        <Link href={gameHref} className="text-amber-400 hover:underline">
          {game.statsRawJson ? "Box score & video" : "View game"}
        </Link>
        {game.youtubeUrl && !game.statsRawJson ? (
          <span className="text-xs text-zinc-500">Video linked</span>
        ) : null}
      </div>
      <div className="mt-2 text-xs text-zinc-500">
        Slot {game.slotInRound} · Game ID{" "}
        <span className="font-mono">{game.id.slice(0, 8)}…</span>
        {game.statsGameId ? (
          <>
            {" "}
            · Stats <span className="font-mono">{game.statsGameId}</span>
          </>
        ) : null}
      </div>
      {canReport ? (
        <div className="mt-3">
          <UploadStatsForm
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
          className="mt-2"
        >
          <button type="submit" className="text-xs text-red-400 hover:underline">
            Clear stats (admin)
          </button>
        </form>
      ) : null}
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
          <div key={round.id}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {scheduleRoundHeading(round.phase, round.roundNumber)}
            </h3>
            {roundGames.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600">No games this week.</p>
            ) : (
              <ul className="msb-card-grid mt-3">
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
          </div>
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
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm">
      <div className="font-medium">
        ({game.slotInRound}) {game.awayName} @ {game.homeName}
      </div>
      <div className="mt-1 text-zinc-400">
        {game.played ? `${game.awayScore}–${game.homeScore}` : "TBD"}
      </div>
      {game.statsGameId ? (
        <Link
          href={`/leagues/${leagueId}/seasons/${seasonId}/games/${game.id}`}
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
