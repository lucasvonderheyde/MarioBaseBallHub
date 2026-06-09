import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { SeasonStandingsPlayoffsView } from "@/components/standings/SeasonStandingsPlayoffsView";
import { buildPlayoffPicture } from "@/domain/playoffs/build-playoff-picture";
import { buildBracketPicture } from "@/domain/playoffs/bracket-model";
import { computeClinchStatus } from "@/domain/playoffs/compute-clinch-status";
import {
  getDirectQualifyCount,
  parsePlayoffSettings,
  playInEnabled,
} from "@/domain/playoffs/playoff-settings";
import { db } from "@/db";
import { leagues } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, isLeagueAdmin, leagueExists } from "@/lib/league-access";
import {
  getLeaguePlayoffData,
  getLeagueSeasons,
  pickDefaultSeasonId,
} from "@/lib/league-seasons";
import { isRegularSeasonComplete } from "@/lib/regular-season-status";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string }>;
};

export default async function LeagueStandingsPage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { season: seasonParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!(await leagueExists(leagueId))) notFound();

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) notFound();

  const role = await getLeagueRole(leagueId, user);

  const seasons = await getLeagueSeasons(leagueId);
  if (seasons.length === 0) notFound();

  const seasonId =
    seasonParam && seasons.some((s) => s.id === seasonParam)
      ? seasonParam
      : pickDefaultSeasonId(seasons)!;

  const dash = await getLeaguePlayoffData(leagueId, seasonId);
  if (!dash) notFound();

  const settings = parsePlayoffSettings(dash.season.playoffSettings);
  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));
  const picture = buildPlayoffPicture({
    standings: dash.standings,
    settings,
    rounds: dash.rounds,
    games: dash.games.map(({ game, round }) => ({ game, round })),
    teamNames,
  });

  const remainingRegularGames = dash.games
    .filter(({ round, game }) => round.phase === "regular" && game.playedAt == null)
    .map(({ game }) => ({
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
    }));

  const clinchByTeam = new Map(
    computeClinchStatus({
      standings: dash.standings,
      settings,
      remainingRegularGames,
    }).map((row) => [row.teamId, row.badges]),
  );

  const regularSeasonComplete = isRegularSeasonComplete(dash.games);

  const bracket = buildBracketPicture({
    seeds: picture.seeds,
    settings,
    playInGames: picture.playInGames,
    mainBracketRounds: picture.mainBracketRounds,
    teamNames,
  });

  const selectedSeason = seasons.find((s) => s.id === seasonId)!;
  const showPlayIn = playInEnabled(settings);
  const directSpots = getDirectQualifyCount(settings);

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={league.name}
        title={regularSeasonComplete ? "Playoffs" : "Standings"}
        subtitle={
          regularSeasonComplete
            ? "Regular season complete. Bracket and final standings below."
            : "Regular-season standings with projected playoff bracket."
        }
      >
        {seasons.map((s) => (
          <Link
            key={s.id}
            href={`/leagues/${leagueId}/standings?season=${s.id}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              s.id === seasonId
                ? "border-amber-600 bg-amber-950/50 text-amber-200"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {s.name}
            {s.status === "active" ? " · current" : ""}
          </Link>
        ))}
      </PageHero>

      <SeasonStandingsPlayoffsView
        leagueId={leagueId}
        seasonId={seasonId}
        seasonName={selectedSeason.name}
        settings={settings}
        standings={dash.standings}
        picture={picture}
        bracket={bracket}
        clinchByTeam={clinchByTeam}
        directSpots={directSpots}
        showPlayIn={showPlayIn}
        regularSeasonComplete={regularSeasonComplete}
        isAdmin={isLeagueAdmin(role)}
      />
    </PageShell>
  );
}
