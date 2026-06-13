import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, isLeagueAdmin } from "@/lib/league-access";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { parseTiebreakerOrder } from "@/domain/standings/tiebreakers";
import { TiebreakerOrderDisplay } from "@/components/standings/TiebreakerOrderDisplay";
import { PageShell } from "@/components/PageShell";
import { PageHero } from "@/components/PageHero";
import { SeasonNewsPanel } from "@/components/season/SeasonNewsPanel";
import { aiNewsEnabled } from "@/lib/ai-news";
import { getSeasonNewsPosts } from "@/lib/league-news";
import { getRecentSeasonEvents } from "@/lib/season-events";
import { SeasonHubStandings } from "@/components/season/SeasonHubStandings";
import { SeasonWeekTimeline } from "@/components/season/SeasonWeekTimeline";
import { SeasonHubFeaturedRecords } from "@/components/season/SeasonHubFeaturedRecords";
import { SeasonHubRecordsCompact } from "@/components/season/SeasonHubRecordsCompact";
import { ChampionshipOddsPanel } from "@/components/season/ChampionshipOddsPanel";
import { SeasonRivalryOfWeekPanel } from "@/components/season/SeasonRivalryOfWeekPanel";
import { SeasonScoreboard } from "@/components/season/SeasonScoreboard";
import { SeasonHubHeadlines } from "@/components/season/SeasonHubHeadlines";
import { getSeasonRecords } from "@/lib/season-records";
import { listSeriesOptions } from "@/lib/inky-briefs";
import { buildSeasonOddsSnapshot } from "@/lib/season-odds";
import { getManagedTeamInSeason } from "@/lib/manager-team";
import {
  pendingProposalsByGameId,
  getPendingScheduleProposalsForSeason,
} from "@/lib/schedule-proposals";
import { toScheduleGameDisplay } from "@/lib/schedule-display";
import { selectUpcomingScheduleGames } from "@/lib/upcoming-schedule-games";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string }>;
  searchParams: Promise<{ e?: string; m?: string; count?: string; week?: string }>;
};

export default async function SeasonPage({ params, searchParams }: Props) {
  const { leagueId, seasonId } = await params;
  const { e, m, count, week } = await searchParams;
  const user = await getCurrentUser();

  const role = await getLeagueRole(leagueId, user);

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const { season, teams, games } = dash;
  const isAdmin = isLeagueAdmin(role);
  const teamNames = new Map(teams.map((t) => [t.team.id, t.team.name]));
  const recentEvents = await getRecentSeasonEvents(seasonId, 20);
  const newsPosts = await getSeasonNewsPosts(seasonId, isAdmin);
  const seriesOptions = isAdmin ? await listSeriesOptions(seasonId) : [];
  const scheduleProposals = await getPendingScheduleProposalsForSeason(seasonId);
  const proposalMap = pendingProposalsByGameId(scheduleProposals);
  const { games: upcomingRaw } = selectUpcomingScheduleGames(games, 4);
  const upcomingGames = upcomingRaw.map(({ game, round }) => ({
    game: toScheduleGameDisplay(game, proposalMap.get(game.id) ?? null),
    round,
  }));
  const userTeam = user ? await getManagedTeamInSeason(user.id, seasonId) : null;
  const seasonRecords = await getSeasonRecords(seasonId);
  const oddsSnapshot = buildSeasonOddsSnapshot(dash);
  const gamesPlayed = dash.games.filter(
    ({ game }) => game.statsRawJson != null,
  ).length;
  const rivalry = oddsSnapshot.rivalryOfWeek;
  const rivalryAwayName = rivalry
    ? teamNames.get(rivalry.game.awayTeamId) ?? "Away"
    : null;
  const rivalryHomeName = rivalry
    ? teamNames.get(rivalry.game.homeTeamId) ?? "Home"
    : null;

  const mappedNewsPosts = newsPosts.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.body,
    source: post.source,
    status: post.status,
    postType: post.postType,
    relatedGameId: post.relatedGameId,
    createdAt: post.createdAt,
  }));

  return (
    <PageShell width="wide">
      <PageHero
        className="mb-5 border-b-zinc-800/40 pb-4"
        eyebrow={dash.league.name}
        title={season.name}
        badge={season.status}
        subtitle={
          <>
            Tiebreakers (in order):{" "}
            <TiebreakerOrderDisplay
              order={parseTiebreakerOrder(season.tiebreakerOrder)}
            />
          </>
        }
      >
        {isAdmin ? (
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}/admin`}
            className="msb-link text-sm"
          >
            Season admin settings →
          </Link>
        ) : null}
      </PageHero>

      {e ? (
        <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "renamed" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Season renamed.
        </p>
      ) : null}
      {m === "reservation-updated" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Team reservation updated.
        </p>
      ) : null}
      {m === "status-updated" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Season status updated.
        </p>
      ) : null}
      {m === "playoff-settings" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Playoff settings saved.
        </p>
      ) : null}
      {m === "schedule-settings" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Schedule settings saved.
        </p>
      ) : null}
      {m === "round-robin" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Added {count ?? "0"} round-robin games across weekly rounds.
        </p>
      ) : null}
      {m === "weekly-matchups" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Added {count ?? "0"} game(s) to week {week ?? "?"}.
        </p>
      ) : null}
      {m === "organize-weeks" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Moved {count ?? "0"} game(s) into weekly rounds.
        </p>
      ) : null}

      {season.awardVotingOpen ? (
        <p className="mb-4 rounded-md border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          Season award voting is open.{" "}
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}/awards`}
            className="font-medium text-amber-300 hover:underline"
          >
            Cast your votes →
          </Link>
        </p>
      ) : null}

      <div className="space-y-6">
        <SeasonScoreboard
          leagueId={leagueId}
          seasonId={seasonId}
          games={games}
          upcoming={upcomingGames}
          teamNames={teamNames}
          gameOdds={oddsSnapshot.gameOdds}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            {rivalry && rivalryAwayName && rivalryHomeName ? (
              <SeasonRivalryOfWeekPanel
                leagueId={leagueId}
                seasonId={seasonId}
                rivalry={rivalry}
                awayName={rivalryAwayName}
                homeName={rivalryHomeName}
              />
            ) : null}

            <SeasonNewsPanel
              leagueId={leagueId}
              seasonId={seasonId}
              posts={mappedNewsPosts}
              isAdmin={isAdmin}
              aiEnabled={aiNewsEnabled()}
              seriesOptions={seriesOptions}
              previewGameId={rivalry?.game.gameId ?? null}
            />

            <SeasonHubFeaturedRecords
              leagueId={leagueId}
              seasonId={seasonId}
              records={seasonRecords}
            />

            <SeasonWeekTimeline
              leagueId={leagueId}
              seasonId={seasonId}
              games={games}
              upcoming={upcomingGames}
              teams={teams.map(({ team, manager }) => ({
                team,
                manager: manager ? { id: manager.id } : null,
              }))}
              teamNames={teamNames}
              userId={user?.id ?? ""}
              userTeamId={userTeam?.id ?? null}
              gameOdds={oddsSnapshot.gameOdds}
            />

          </div>

          <aside className="space-y-4">
            <SeasonHubHeadlines
              leagueId={leagueId}
              seasonId={seasonId}
              posts={mappedNewsPosts}
              events={recentEvents.map((event) => ({
                id: event.id,
                message: event.message,
                createdAt: event.createdAt,
              }))}
            />

            <SeasonHubStandings
              leagueId={leagueId}
              seasonId={seasonId}
              standings={dash.standings}
              userTeamId={userTeam?.id ?? null}
              variant="compact"
            />

            <ChampionshipOddsPanel
              leagueId={leagueId}
              seasonId={seasonId}
              gamesPlayed={gamesPlayed}
              variant="compact"
              teams={dash.teams.map(({ team }) => ({
                teamId: team.id,
                name: team.name,
                odds: oddsSnapshot.championshipOdds.get(team.id) ?? 0,
              }))}
            />

            <SeasonHubRecordsCompact
              leagueId={leagueId}
              seasonId={seasonId}
              records={seasonRecords}
            />
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
