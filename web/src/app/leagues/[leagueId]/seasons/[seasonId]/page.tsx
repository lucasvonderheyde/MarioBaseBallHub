import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, isLeagueAdmin } from "@/lib/league-access";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { parseTiebreakerOrder } from "@/domain/standings/tiebreakers";
import { PageShell } from "@/components/PageShell";
import { PageHero } from "@/components/PageHero";
import { SeasonActivityFeed } from "@/components/season/SeasonActivityFeed";
import { getRecentSeasonEvents } from "@/lib/season-events";
import { SeasonHubRecentGames } from "@/components/season/SeasonHubRecentGames";
import { SeasonHubTeamGrid } from "@/components/season/SeasonHubTeamGrid";

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

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={dash.league.name}
        title={season.name}
        badge={season.status}
        subtitle={
          <>
            Tiebreakers (in order):{" "}
            <span className="break-words font-mono text-zinc-300">
              {parseTiebreakerOrder(season.tiebreakerOrder).join(" → ")}
            </span>
          </>
        }
      />

      {isAdmin ? (
        <p className="-mt-4 mb-8 text-center">
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}/admin`}
            className="text-sm text-amber-400 hover:underline"
          >
            Season admin settings →
          </Link>
        </p>
      ) : null}

      {e ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "renamed" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Season renamed.
        </p>
      ) : null}
      {m === "reservation-updated" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Team reservation updated.
        </p>
      ) : null}
      {m === "status-updated" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Season status updated.
        </p>
      ) : null}
      {m === "playoff-settings" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Playoff settings saved.
        </p>
      ) : null}
      {m === "schedule-settings" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Schedule settings saved.
        </p>
      ) : null}
      {m === "round-robin" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Added {count ?? "0"} round-robin games across weekly rounds.
        </p>
      ) : null}
      {m === "weekly-matchups" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Added {count ?? "0"} game(s) to week {week ?? "?"}.
        </p>
      ) : null}
      {m === "organize-weeks" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Moved {count ?? "0"} game(s) into weekly rounds.
        </p>
      ) : null}
      <SeasonHubRecentGames
        leagueId={leagueId}
        seasonId={seasonId}
        games={games}
        teamNames={teamNames}
      />

      <SeasonHubTeamGrid
        leagueId={leagueId}
        seasonId={seasonId}
        teams={teams}
        standings={dash.standings}
      />

      <SeasonActivityFeed
        events={recentEvents.map((event) => ({
          id: event.id,
          message: event.message,
          createdAt: event.createdAt,
        }))}
      />

      <section className="mt-10 msb-panel p-4 sm:p-5" id="standings">
        <h2 className="text-lg font-semibold">Standings</h2>
        <p className="text-sm text-zinc-500">
          Regular-season games only. Playoff rows on the schedule do not affect
          this table yet.
        </p>
        <div className="msb-table-wrap mt-3">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Team</th>
              <th className="py-2 pr-2">W</th>
              <th className="py-2 pr-2">L</th>
              <th className="py-2 pr-2">RF</th>
              <th className="py-2 pr-2">RA</th>
            </tr>
          </thead>
          <tbody>
            {dash.standings.map((row, i) => (
              <tr key={row.teamId} className="border-b border-zinc-900">
                <td className="py-2 pr-2 text-zinc-500">{i + 1}</td>
                <td className="py-2 pr-2">
                  <Link
                    href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${row.teamId}`}
                    className="text-amber-400 hover:underline"
                  >
                    {row.name}
                  </Link>
                  {row.needsTiebreakerGame ? (
                    <span className="ml-2 text-xs text-amber-300">
                      (tiebreaker game)
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-2">{row.wins}</td>
                <td className="py-2 pr-2">{row.losses}</td>
                <td className="py-2 pr-2">{row.runsFor}</td>
                <td className="py-2 pr-2">{row.runsAgainst}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </PageShell>
  );
}

