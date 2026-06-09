import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  SeasonScheduleByRound,
  seasonStatusClass,
  seasonStatusLabel,
} from "@/components/league-schedule-ui";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, isLeagueAdmin, leagueExists } from "@/lib/league-access";
import { groupGamesByRound } from "@/lib/group-games-by-round";
import { getLeagueScheduleData } from "@/lib/league-seasons";
import { PageShell } from "@/components/PageShell";

type Props = {
  params: Promise<{ leagueId: string }>;
};

export default async function LeagueSchedulePage({ params }: Props) {
  const { leagueId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!(await leagueExists(leagueId))) notFound();

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();
  const isAdmin = isLeagueAdmin(role);

  const seasons = await getLeagueScheduleData(leagueId);
  if (seasons.length === 0) {
    return (
      <PageShell width="wide">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="mt-4 text-sm text-zinc-500">No seasons yet.</p>
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <h1 className="text-2xl font-bold">Schedule</h1>
      <p className="mt-1 text-sm text-zinc-500">
        All games by season. The current season is listed first. Managers can report
        games they played in directly from this page.
      </p>

      <div className="mt-8 space-y-10">
        {seasons.map(({ season, dash }) => {
          const gamesByRound = groupGamesByRound(dash.games);

          return (
            <section
              key={season.id}
              className={`rounded-lg border p-4 ${seasonStatusClass(season.status)}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{season.name}</h2>
                  <p className="text-xs uppercase tracking-wide opacity-80">
                    {seasonStatusLabel(season.status)}
                  </p>
                </div>
                <Link
                  href={`/leagues/${leagueId}/seasons/${season.id}`}
                  className="text-sm text-amber-400 hover:underline"
                >
                  Season hub →
                </Link>
              </div>

              <SeasonScheduleByRound
                leagueId={leagueId}
                seasonId={season.id}
                rounds={dash.rounds}
                gamesByRound={gamesByRound}
                teams={dash.teams}
                userId={user.id}
                role={role}
                isAdmin={isAdmin}
                className="mt-4 space-y-8"
              />
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
