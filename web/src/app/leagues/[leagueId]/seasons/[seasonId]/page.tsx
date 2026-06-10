import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, isLeagueAdmin } from "@/lib/league-access";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { parseTiebreakerOrder } from "@/domain/standings/tiebreakers";
import { TiebreakerOrderDisplay } from "@/components/standings/TiebreakerOrderDisplay";
import { PageShell } from "@/components/PageShell";
import { PageHero } from "@/components/PageHero";
import { SeasonActivityFeed } from "@/components/season/SeasonActivityFeed";
import { getRecentSeasonEvents } from "@/lib/season-events";
import { SeasonHubRecentGames } from "@/components/season/SeasonHubRecentGames";
import { SeasonHubStandings } from "@/components/season/SeasonHubStandings";
import { SeasonHubTeamGrid } from "@/components/season/SeasonHubTeamGrid";
import { SeasonHubUpcomingGames } from "@/components/season/SeasonHubUpcomingGames";
import { SeasonHubFeaturedRecords } from "@/components/season/SeasonHubFeaturedRecords";
import { SeasonHubRecordsCompact } from "@/components/season/SeasonHubRecordsCompact";
import { SeasonTradePanel } from "@/components/season/SeasonTradePanel";
import { ChampionshipOddsPanel } from "@/components/season/ChampionshipOddsPanel";
import { SeasonRivalryOfWeekPanel } from "@/components/season/SeasonRivalryOfWeekPanel";
import { getSeasonRecords } from "@/lib/season-records";
import { buildSeasonOddsSnapshot } from "@/lib/season-odds";
import { getManagedTeamInSeason } from "@/lib/manager-team";
import { getTeamRosterCountsForSeason } from "@/lib/roster-rules";
import {
  pendingProposalsByGameId,
  getPendingScheduleProposalsForSeason,
} from "@/lib/schedule-proposals";
import { toScheduleGameDisplay } from "@/lib/schedule-display";
import { selectUpcomingScheduleGames } from "@/lib/upcoming-schedule-games";
import {
  getPendingTradeRequestsForSeason,
  getTradeRosterInstancesForSeason,
} from "@/lib/trade-requests";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string }>;
  searchParams: Promise<{ e?: string; m?: string; count?: string; week?: string }>;
};

export default async function SeasonPage({ params, searchParams }: Props) {
  const { leagueId, seasonId } = await params;
  const { e, m, count, week } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const { season, teams, games } = dash;
  const isAdmin = isLeagueAdmin(role);
  const teamNames = new Map(teams.map((t) => [t.team.id, t.team.name]));
  const recentEvents = await getRecentSeasonEvents(seasonId, 20);
  const scheduleProposals = await getPendingScheduleProposalsForSeason(seasonId);
  const proposalMap = pendingProposalsByGameId(scheduleProposals);
  const { games: upcomingRaw, phase: upcomingPhase } = selectUpcomingScheduleGames(
    games,
    4,
  );
  const upcomingGames = upcomingRaw.map(({ game, round }) => ({
    game: toScheduleGameDisplay(game, proposalMap.get(game.id) ?? null),
    round,
  }));
  const rosterCounts = await getTeamRosterCountsForSeason(seasonId);
  const userTeam = await getManagedTeamInSeason(user.id, seasonId);
  const tradeRoster = await getTradeRosterInstancesForSeason(seasonId);
  const pendingTrades = await getPendingTradeRequestsForSeason(seasonId);
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

      <div className="space-y-4">
        {rivalry && rivalryAwayName && rivalryHomeName ? (
          <SeasonRivalryOfWeekPanel
            leagueId={leagueId}
            seasonId={seasonId}
            rivalry={rivalry}
            awayName={rivalryAwayName}
            homeName={rivalryHomeName}
          />
        ) : null}

        <ChampionshipOddsPanel
          leagueId={leagueId}
          seasonId={seasonId}
          gamesPlayed={gamesPlayed}
          teams={dash.teams.map(({ team }) => ({
            teamId: team.id,
            name: team.name,
            odds: oddsSnapshot.championshipOdds.get(team.id) ?? 0,
          }))}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <SeasonHubRecentGames
            leagueId={leagueId}
            seasonId={seasonId}
            games={games}
            teamNames={teamNames}
            userTeamId={userTeam?.id ?? null}
          />
          <SeasonHubStandings
            leagueId={leagueId}
            seasonId={seasonId}
            standings={dash.standings}
            userTeamId={userTeam?.id ?? null}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SeasonHubFeaturedRecords
            leagueId={leagueId}
            seasonId={seasonId}
            records={seasonRecords}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SeasonHubUpcomingGames
            leagueId={leagueId}
            seasonId={seasonId}
            phase={upcomingPhase}
            upcoming={upcomingGames}
            teams={teams.map(({ team, manager }) => ({
              team,
              manager: manager ? { id: manager.id } : null,
            }))}
            userId={user.id}
            gameOdds={oddsSnapshot.gameOdds}
          />
          <SeasonHubRecordsCompact
            leagueId={leagueId}
            seasonId={seasonId}
            records={seasonRecords}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SeasonHubTeamGrid
            leagueId={leagueId}
            seasonId={seasonId}
            teams={teams}
            standings={dash.standings}
            rosterCounts={rosterCounts}
          />

          <SeasonTradePanel
            leagueId={leagueId}
            seasonId={seasonId}
            userId={user.id}
            userTeam={userTeam}
            teams={teams.map(({ team, manager }) => ({
              id: team.id,
              name: team.name,
              managerUserId: manager?.id ?? null,
            }))}
            roster={tradeRoster}
            pendingTrades={pendingTrades}
          />
        </div>

        <SeasonActivityFeed
          events={recentEvents.map((event) => ({
            id: event.id,
            message: event.message,
            createdAt: event.createdAt,
          }))}
        />
      </div>
    </PageShell>
  );
}

