import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  SeasonScheduleByRound,
  seasonStatusClass,
  seasonStatusLabel,
} from "@/components/league-schedule-ui";
import { PageHero, SeasonSectionHeader } from "@/components/PageHero";
import { db } from "@/db";
import { leagues } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, isLeagueAdmin, leagueExists } from "@/lib/league-access";
import { buildScheduleGamesByRound } from "@/lib/build-schedule-games-by-round";
import { getPendingScheduleProposalsForSeason } from "@/lib/schedule-proposals";
import { getLeagueScheduleData } from "@/lib/league-seasons";
import { buildSeasonOddsSnapshot } from "@/lib/season-odds";
import { PageShell } from "@/components/PageShell";

type Props = {
  params: Promise<{ leagueId: string }>;
};

export default async function LeagueSchedulePage({ params }: Props) {
  const { leagueId } = await params;
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
  if (!role) notFound();
  const isAdmin = isLeagueAdmin(role);

  const seasons = await getLeagueScheduleData(leagueId);
  const seasonsWithSchedule = await Promise.all(
    seasons.map(async ({ season, dash }) => {
      const proposals = await getPendingScheduleProposalsForSeason(season.id);
      const gamesByRound = buildScheduleGamesByRound(dash.games, proposals);
      return { season, dash, gamesByRound };
    }),
  );

  if (seasonsWithSchedule.length === 0) {
    return (
      <PageShell width="wide">
        <PageHero
          eyebrow={league.name}
          title="Schedule"
          subtitle="No seasons yet."
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={league.name}
        title="Schedule"
        subtitle="All games by season. The current season is listed first. Managers can report games they played in directly from this page."
      />

      <div className="space-y-10">
        {seasonsWithSchedule.map(({ season, dash, gamesByRound }) => (
            <section
              key={season.id}
              className={`rounded-lg border p-5 sm:p-6 ${seasonStatusClass(season.status)}`}
            >
              <SeasonSectionHeader
                seasonName={season.name}
                statusLabel={seasonStatusLabel(season.status)}
                href={`/leagues/${leagueId}/seasons/${season.id}`}
              />

              <SeasonScheduleByRound
                leagueId={leagueId}
                seasonId={season.id}
                rounds={dash.rounds}
                gamesByRound={gamesByRound}
                teams={dash.teams}
                userId={user.id}
                role={role}
                isAdmin={isAdmin}
                gameOdds={buildSeasonOddsSnapshot(dash).gameOdds}
                className="mt-6 space-y-6"
              />
            </section>
        ))}
      </div>
    </PageShell>
  );
}
