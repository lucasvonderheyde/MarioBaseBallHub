import { CharacterIcon } from "@/components/CharacterIcon";
import { CharacterLink } from "@/components/CharacterLink";
import type { GameMvpPick } from "@/domain/stats/compute-game-mvp";
import {
  winnerScoreClass,
  winnerTeamNameClass,
  type GameWinnerSide,
} from "@/components/games/GameMatchupScore";

type Props = {
  awayTeamName: string;
  homeTeamName: string;
  awayScore: number | null;
  homeScore: number | null;
  played: boolean;
  winner: GameWinnerSide;
  stadiumId: string | null;
  stadiumIconUrl: string | null;
  mvp: GameMvpPick | null;
  mvpTeamName: string | null;
  mvpDisplayName: string | null;
  leagueId: string;
  seasonId: string;
};

export function GameReportHero({
  awayTeamName,
  homeTeamName,
  awayScore,
  homeScore,
  played,
  winner,
  stadiumId,
  stadiumIconUrl,
  mvp,
  mvpTeamName,
  mvpDisplayName,
  leagueId,
  seasonId,
}: Props) {
  return (
    <section className="msb-panel p-5 sm:p-6">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="flex flex-1 justify-center lg:justify-start">
          {stadiumIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stadiumIconUrl}
              alt=""
              width={192}
              height={192}
              className="h-32 w-32 shrink-0 rounded-lg object-contain sm:h-40 sm:w-40"
            />
          ) : (
            <div
              className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/50 sm:h-40 sm:w-40"
              aria-hidden
            >
              <span className="text-4xl opacity-40">⚾</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">
            <span className={winnerTeamNameClass("away", winner)}>{awayTeamName}</span>
            <span className="mx-2 font-normal text-zinc-500">@</span>
            <span className={winnerTeamNameClass("home", winner)}>{homeTeamName}</span>
          </h1>

          {stadiumId ? (
            <p className="mt-2 text-sm text-zinc-500">{stadiumId}</p>
          ) : null}

          {played && awayScore != null && homeScore != null ? (
            <p className="mt-4 text-3xl font-semibold tabular-nums sm:text-4xl">
              <span className={winnerScoreClass("away", winner)}>{awayScore}</span>
              <span className="mx-3 text-zinc-600">–</span>
              <span className={winnerScoreClass("home", winner)}>{homeScore}</span>
            </p>
          ) : (
            <p className="mt-3 text-zinc-500">Scheduled — stats not reported yet</p>
          )}
        </div>

        <div className="flex flex-1 justify-center lg:justify-end">
          {mvp && mvpDisplayName ? (
            <div className="flex w-full max-w-xs items-center gap-4 rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-left lg:max-w-sm">
              <CharacterIcon charId={mvp.charId} size={44} className="shrink-0 rounded-md" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-400/90">
                  Game MVP
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-amber-100">
                  <CharacterLink
                    charId={mvp.charId}
                    displayName={mvpDisplayName}
                    leagueId={leagueId}
                    seasonId={seasonId}
                    className="text-amber-100 hover:text-amber-50"
                  />
                  {mvpTeamName ? (
                    <span className="font-normal text-zinc-500"> · {mvpTeamName}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{mvp.summary}</p>
              </div>
            </div>
          ) : (
            <div className="hidden lg:block lg:w-48" aria-hidden />
          )}
        </div>
      </div>
    </section>
  );
}
