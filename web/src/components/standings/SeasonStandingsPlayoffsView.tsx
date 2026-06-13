import Link from "next/link";
import { PlayoffGameCard } from "@/components/league-schedule-ui";
import { HighlightedMatchupCard } from "@/components/matchups/HighlightedMatchupCard";
import { PlayoffBracketSvg } from "@/components/playoffs/PlayoffBracketSvg";
import { SectionHeading } from "@/components/SectionHeading";
import {
  rivalryReasonLabel,
  type RivalryOfWeekPick,
} from "@/domain/odds/rivalry-of-week";
import type { BracketPicture } from "@/domain/playoffs/bracket-model";
import { enrichGamesWithSeries } from "@/domain/playoffs/bracket-model";
import type { PlayoffPicture } from "@/domain/playoffs/build-playoff-picture";
import type { TeamClinchStatus } from "@/domain/playoffs/compute-clinch-status";
import type { PlayoffProbabilityRow } from "@/domain/playoffs/playoff-probability";
import type { PlayoffSettings } from "@/domain/playoffs/playoff-settings";
import { standingsStatHeaders } from "@/components/stats/stat-table-headers";
import type { TeamStandingRow } from "@/domain/standings/compute-standings";

type Props = {
  leagueId: string;
  seasonId: string;
  seasonName: string;
  settings: PlayoffSettings;
  standings: TeamStandingRow[];
  picture: PlayoffPicture;
  bracket: BracketPicture;
  clinchByTeam: Map<string, TeamClinchStatus["badges"]>;
  playoffOddsByTeam?: Map<string, PlayoffProbabilityRow>;
  directSpots: number;
  showPlayIn: boolean;
  regularSeasonComplete: boolean;
  isAdmin: boolean;
  gameOdds?: Map<string, { homeWinPct: number; awayWinPct: number }>;
  playoffFeatured?: RivalryOfWeekPick | null;
  teamNames?: Map<string, string>;
};

function seedBadge(status: "qualified" | "play-in" | "out"): string {
  if (status === "qualified") return "Auto";
  if (status === "play-in") return "Play-in";
  return "Out";
}

function seedBadgeClass(status: "qualified" | "play-in" | "out"): string {
  if (status === "qualified") return "bg-emerald-950/60 text-emerald-300";
  if (status === "play-in") return "bg-amber-950/60 text-amber-300";
  return "bg-zinc-900 text-zinc-500";
}

function clinchLabel(badge: string): string {
  if (badge === "clinched-playoffs") return "Clinched";
  if (badge === "clinched-top-seed") return "#1 seed";
  if (badge === "clinched-home-field") return "Home field";
  return badge;
}

function clinchClass(badge: string): string {
  if (badge === "clinched-top-seed") return "bg-amber-950/60 text-amber-300";
  if (badge === "clinched-home-field") return "bg-sky-950/60 text-sky-300";
  return "bg-emerald-950/60 text-emerald-300";
}

function formatPlayoffPct(pct: number): string {
  if (pct >= 1) return "100%";
  if (pct <= 0) return "0%";
  if (pct > 0.99) return ">99%";
  if (pct < 0.01) return "<1%";
  return `${Math.round(pct * 100)}%`;
}

function playoffPctClass(pct: number): string {
  if (pct >= 1) return "text-emerald-300";
  if (pct <= 0) return "text-zinc-600";
  if (pct >= 0.75) return "text-emerald-400/90";
  if (pct < 0.25) return "text-zinc-500";
  return "text-zinc-300";
}

export function SeasonStandingsPlayoffsView({
  leagueId,
  seasonId,
  seasonName,
  settings,
  standings,
  picture,
  bracket,
  clinchByTeam,
  playoffOddsByTeam,
  directSpots,
  showPlayIn,
  regularSeasonComplete,
  isAdmin,
  gameOdds,
  playoffFeatured,
  teamNames,
}: Props) {
  const isLive = bracket.mode === "live";
  const playoffsPhase = regularSeasonComplete;

  const seedByTeamId = new Map(picture.seeds.map((s) => [s.teamId, s]));

  const standingsSection = (
    <section className={playoffsPhase ? "mt-10" : "mt-8"}>
      <SectionHeading>
        {playoffsPhase ? `${seasonName} — Final standings` : "Standings"}
      </SectionHeading>
      <p className="text-sm text-zinc-500">
        Regular-season results only.
        {!playoffsPhase && playoffOddsByTeam
          ? " Playoff % = 2,000 simulations of the remaining schedule using matchup odds and this season's tiebreakers."
          : null}
        {!playoffsPhase && showPlayIn
          ? ` Top ${directSpots} auto-qualify · Seeds ${directSpots + 1}–${directSpots + settings.playInTeamCount} play in for ${settings.playInSpots} spot${settings.playInSpots === 1 ? "" : "s"}.`
          : null}
      </p>
      <div className="msb-table-wrap mt-3">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Team</th>
              {standingsStatHeaders()}
              {!playoffsPhase ? (
                <>
                  {playoffOddsByTeam ? (
                    <th className="py-2 pr-2" title="Chance to finish inside the playoff cutoff, from 2,000 simulations of the remaining schedule using the matchup win model and this season's tiebreakers">
                      Playoff %
                    </th>
                  ) : null}
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Clinch</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => {
              const seed = seedByTeamId.get(row.teamId);
              const badges = clinchByTeam.get(row.teamId) ?? [];
              return (
                <tr key={row.teamId} className="border-b border-zinc-900">
                  <td className="py-2 pr-2 tabular-nums text-zinc-500">{index + 1}</td>
                  <td className="py-2 pr-2">
                    <Link
                      href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${row.teamId}`}
                      className="text-amber-400 hover:underline"
                    >
                      {row.name}
                    </Link>
                    {row.needsTiebreakerGame ? (
                      <span className="ml-2 text-xs text-amber-300">(tiebreaker)</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-2 tabular-nums">{row.wins}</td>
                  <td className="py-2 pr-2 tabular-nums">{row.losses}</td>
                  <td className="py-2 pr-2 tabular-nums">{row.runsFor}</td>
                  <td className="py-2 pr-2 tabular-nums">{row.runsAgainst}</td>
                  {!playoffsPhase && seed ? (
                    <>
                      {playoffOddsByTeam ? (
                        <td className="py-2 pr-2 tabular-nums">
                          <span
                            className={playoffPctClass(
                              playoffOddsByTeam.get(row.teamId)?.playoffPct ?? 0,
                            )}
                          >
                            {formatPlayoffPct(
                              playoffOddsByTeam.get(row.teamId)?.playoffPct ?? 0,
                            )}
                          </span>
                        </td>
                      ) : null}
                      <td className="py-2 pr-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${seedBadgeClass(seed.status)}`}
                        >
                          {seedBadge(seed.status)}
                        </span>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex flex-wrap gap-1">
                          {badges.map((badge) => (
                            <span
                              key={badge}
                              className={`rounded px-2 py-0.5 text-xs ${clinchClass(badge)}`}
                            >
                              {clinchLabel(badge)}
                            </span>
                          ))}
                        </div>
                      </td>
                    </>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  const bracketSection = (
    <section className={playoffsPhase ? "mt-8" : "mt-10"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionHeading>Playoff bracket</SectionHeading>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs ${
            isLive ? "bg-emerald-950/60 text-emerald-300" : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {isLive ? "Live" : "Projected"}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Play-in BO{settings.playInBestOf} · Main rounds BO{settings.mainRoundBestOf} ·
        Finals BO{settings.finalsBestOf}
        {settings.higherSeedHomeField ? " · Higher seed home field" : null}
      </p>
      <PlayoffBracketSvg bracket={bracket} />
    </section>
  );

  const featuredAway =
    playoffFeatured && teamNames
      ? teamNames.get(playoffFeatured.game.awayTeamId) ?? "Away"
      : null;
  const featuredHome =
    playoffFeatured && teamNames
      ? teamNames.get(playoffFeatured.game.homeTeamId) ?? "Home"
      : null;

  return (
    <>
      {playoffFeatured && featuredAway && featuredHome ? (
        <section className="mt-6">
          <HighlightedMatchupCard
            headline="Featured playoff matchup"
            subheadline={`Playoff round ${playoffFeatured.weekNumber}`}
            awayName={featuredAway}
            homeName={featuredHome}
            awayWinPct={playoffFeatured.awayWinPct}
            homeWinPct={playoffFeatured.homeWinPct}
            reasons={playoffFeatured.reasons}
            gameHref={`/leagues/${leagueId}/seasons/${seasonId}/games/${playoffFeatured.game.gameId}`}
            variant="featured"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Picked for playoff stakes
            {playoffFeatured.reasons.length > 0
              ? ` and ${playoffFeatured.reasons.map(rivalryReasonLabel).join(", ").toLowerCase()}`
              : ""}
            .
          </p>
        </section>
      ) : null}

      {isAdmin ? (
        <p className="mt-3 text-xs text-zinc-500">
          Playoff format and seeding rules are configured in{" "}
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}/admin#playoff-settings`}
            className="text-amber-400 hover:underline"
          >
            season admin settings
          </Link>
          .
        </p>
      ) : null}

      {playoffsPhase ? bracketSection : standingsSection}
      {playoffsPhase ? standingsSection : bracketSection}

      {playoffsPhase && showPlayIn ? (
        <section className="mt-10">
          <SectionHeading>Play-in games</SectionHeading>
          <p className="text-sm text-zinc-500">
            Best of {settings.playInBestOf} · Playoff schedule round{" "}
            {settings.playInRoundNumber}.{" "}
            <Link
              href={`/leagues/${leagueId}/schedule`}
              className="text-amber-400 hover:underline"
            >
              View schedule
            </Link>
          </p>
          {picture.playInGames.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No play-in games scheduled yet.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {enrichGamesWithSeries(picture.playInGames, settings.playInBestOf).map(
                (game) => (
                  <PlayoffGameCard
                    key={game.id}
                    game={game}
                    leagueId={leagueId}
                    seasonId={seasonId}
                    awayWinPct={gameOdds?.get(game.id)?.awayWinPct}
                    homeWinPct={gameOdds?.get(game.id)?.homeWinPct}
                  />
                ),
              )}
            </div>
          )}
        </section>
      ) : null}

      {playoffsPhase ? (
        <section className="mt-10">
          <SectionHeading>Main bracket games</SectionHeading>
          {picture.mainBracketRounds.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No main-bracket playoff games yet. Create playoff rounds on the schedule
              after play-in (if any).
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {picture.mainBracketRounds.map(({ roundNumber, games }, index) => {
                const isFinals = index === picture.mainBracketRounds.length - 1;
                const bestOf = isFinals ? settings.finalsBestOf : settings.mainRoundBestOf;
                const enriched = enrichGamesWithSeries(games, bestOf);
                return (
                  <div key={roundNumber}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                      Round {roundNumber}
                      {isFinals ? ` · Finals (BO${bestOf})` : ` · BO${bestOf}`}
                    </h3>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {enriched.map((game) => (
                        <PlayoffGameCard
                          key={game.id}
                          game={game}
                          leagueId={leagueId}
                          seasonId={seasonId}
                          awayWinPct={gameOdds?.get(game.id)?.awayWinPct}
                          homeWinPct={gameOdds?.get(game.id)?.homeWinPct}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
