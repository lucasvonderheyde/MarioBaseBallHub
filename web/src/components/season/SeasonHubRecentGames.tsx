import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  gameWinnerSide,
  GameScoreInline,
  winnerTeamNameClass,
} from "@/components/games/GameMatchupScore";
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
  userTeamId?: string | null;
  limit?: number;
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

export function SeasonHubRecentGames({
  leagueId,
  seasonId,
  games,
  teamNames,
  userTeamId,
  limit = 6,
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
    <Card
      title="Recent results"
      action={
        <Link
          href={`/leagues/${leagueId}/schedule`}
          className="msb-link shrink-0 text-xs"
        >
          All games →
        </Link>
      }
    >
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
                className="msb-row-divider flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm"
              >
                <span className="w-20 shrink-0 text-xs text-zinc-500">
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
        <div className="msb-empty-state">
          <p className="text-sm text-zinc-500">No games played yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Upload a box score to get started
          </p>
        </div>
      )}
    </Card>
  );
}
