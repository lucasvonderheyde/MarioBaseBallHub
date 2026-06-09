export type GameWinnerSide = "away" | "home" | "tie";

export function gameWinnerSide(
  awayScore: number,
  homeScore: number,
): GameWinnerSide {
  if (awayScore > homeScore) return "away";
  if (homeScore > awayScore) return "home";
  return "tie";
}

export function winnerTeamNameClass(side: "away" | "home", winner: GameWinnerSide): string {
  const isWinner = winner === side;
  const isLoser =
    (winner === "away" && side === "home") || (winner === "home" && side === "away");
  if (isWinner) return "font-semibold text-amber-400";
  if (isLoser) return "text-zinc-500";
  return "text-zinc-300";
}

export function winnerScoreClass(side: "away" | "home", winner: GameWinnerSide): string {
  const isWinner = winner === side;
  return isWinner ? "font-semibold text-amber-400" : "text-zinc-400";
}

type MatchupProps = {
  awayName: string;
  homeName: string;
  awayScore: number;
  homeScore: number;
  className?: string;
};

/** Full-width scoreboard row: away | score | home */
export function GameMatchupScoreboard({
  awayName,
  homeName,
  awayScore,
  homeScore,
  className = "",
}: MatchupProps) {
  const winner = gameWinnerSide(awayScore, homeScore);

  return (
    <div
      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 rounded-md border border-zinc-700/80 bg-zinc-950/60 px-3 py-2.5 tabular-nums ${className}`}
    >
      <span className={`truncate text-sm ${winnerTeamNameClass("away", winner)}`}>
        {awayName}
      </span>
      <span className="flex shrink-0 items-baseline gap-1.5 text-lg font-semibold leading-none">
        <span className={winnerScoreClass("away", winner)}>{awayScore}</span>
        <span className="text-sm font-normal text-zinc-600">–</span>
        <span className={winnerScoreClass("home", winner)}>{homeScore}</span>
      </span>
      <span
        className={`truncate text-right text-sm ${winnerTeamNameClass("home", winner)}`}
      >
        {homeName}
      </span>
    </div>
  );
}

/** Compact inline matchup for list rows. */
export function GameMatchupInline({
  awayName,
  homeName,
  awayScore,
  homeScore,
  className = "",
}: MatchupProps) {
  const winner = gameWinnerSide(awayScore, homeScore);

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1 tabular-nums ${className}`}>
      <span className={winnerTeamNameClass("away", winner)}>{awayName}</span>
      <span className={winnerScoreClass("away", winner)}>{awayScore}</span>
      <span className="text-zinc-600">–</span>
      <span className={winnerScoreClass("home", winner)}>{homeScore}</span>
      <span className={winnerTeamNameClass("home", winner)}>{homeName}</span>
    </span>
  );
}

/** Score only, winner highlighted. */
export function GameScoreInline({
  awayScore,
  homeScore,
  className = "",
}: {
  awayScore: number;
  homeScore: number;
  className?: string;
}) {
  const winner = gameWinnerSide(awayScore, homeScore);

  return (
    <span className={`inline-flex items-baseline gap-1 tabular-nums ${className}`}>
      <span className={winnerScoreClass("away", winner)}>{awayScore}</span>
      <span className="text-zinc-600">–</span>
      <span className={winnerScoreClass("home", winner)}>{homeScore}</span>
    </span>
  );
}
