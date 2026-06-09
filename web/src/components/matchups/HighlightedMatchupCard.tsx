import Link from "next/link";
import {
  GameMatchupInline,
  GameMatchupScoreboard,
} from "@/components/games/GameMatchupScore";
import { formatWinPct } from "@/domain/odds/game-win-probability";
import {
  rivalryReasonLabel,
  type RivalryPickReason,
} from "@/domain/odds/rivalry-of-week";

export type HighlightedMatchupCardProps = {
  awayName: string;
  homeName: string;
  awayWinPct?: number;
  homeWinPct?: number;
  headline: string;
  subheadline?: string;
  reasons?: RivalryPickReason[];
  gameHref?: string;
  awayScore?: number | null;
  homeScore?: number | null;
  played?: boolean;
  seriesLabel?: string | null;
  variant?: "featured" | "playoff";
};

function reasonClass(reason: RivalryPickReason): string {
  if (reason === "underdog_battle") return "border-amber-800/50 bg-amber-950/40 text-amber-200";
  if (reason === "playoff_stakes") return "border-emerald-800/50 bg-emerald-950/40 text-emerald-200";
  return "border-zinc-700 bg-zinc-900/60 text-zinc-300";
}

export function HighlightedMatchupCard({
  awayName,
  homeName,
  awayWinPct,
  homeWinPct,
  headline,
  subheadline,
  reasons = [],
  gameHref,
  awayScore,
  homeScore,
  played = false,
  seriesLabel,
  variant = "featured",
}: HighlightedMatchupCardProps) {
  const shellClass =
    variant === "featured"
      ? "msb-panel overflow-hidden border-amber-900/40 bg-gradient-to-br from-amber-950/25 via-zinc-950 to-zinc-950"
      : "overflow-hidden rounded-lg border border-msb-grass/45 bg-emerald-950/20";

  const hasFinalScore =
    played && awayScore != null && homeScore != null;

  const matchupBody = hasFinalScore ? (
    <GameMatchupScoreboard
      awayName={awayName}
      homeName={homeName}
      awayScore={awayScore}
      homeScore={homeScore}
    />
  ) : (
    <p className="text-lg font-semibold text-zinc-100 sm:text-xl">
      {awayName}
      <span className="mx-2 font-normal text-zinc-500">@</span>
      {homeName}
    </p>
  );

  const content = (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
            {headline}
          </p>
          {subheadline ? (
            <p className="mt-1 text-sm text-zinc-500">{subheadline}</p>
          ) : null}
          {seriesLabel ? (
            <p className="mt-1 text-xs text-zinc-500">{seriesLabel}</p>
          ) : null}
        </div>
        {!hasFinalScore && awayWinPct != null && homeWinPct != null ? (
          <div className="flex gap-2 text-right text-sm">
            <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
              <div className="text-xs text-zinc-500">{awayName}</div>
              <div className="font-semibold tabular-nums text-zinc-200">
                {formatWinPct(awayWinPct)}
              </div>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
              <div className="text-xs text-zinc-500">{homeName}</div>
              <div className="font-semibold tabular-nums text-zinc-200">
                {formatWinPct(homeWinPct)}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4">{matchupBody}</div>

      {reasons.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <span
              key={reason}
              className={`rounded-full border px-2.5 py-1 text-xs ${reasonClass(reason)}`}
            >
              {rivalryReasonLabel(reason)}
            </span>
          ))}
        </div>
      ) : null}

      {!hasFinalScore && awayWinPct != null && homeWinPct != null ? (
        <p className="mt-3 text-xs text-zinc-500">
          Win odds blend roster talent, chemistry, season record, run differential,
          and head-to-head history (league games only).
        </p>
      ) : null}
    </div>
  );

  if (gameHref) {
    return (
      <article className={shellClass}>
        <Link href={gameHref} className="block transition hover:opacity-95">
          {content}
        </Link>
      </article>
    );
  }

  return <article className={shellClass}>{content}</article>;
}
