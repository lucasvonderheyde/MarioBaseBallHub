import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { SeasonHubTeamGrid } from "@/components/season/SeasonHubTeamGrid";
import { db } from "@/db";
import { leagues } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, leagueExists } from "@/lib/league-access";
import { getLeagueSeasons, pickDefaultSeasonId } from "@/lib/league-seasons";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { getTeamRosterCountsForSeason } from "@/lib/roster-rules";
import { getTeamCardHighlightsForSeason } from "@/lib/team-card-highlights";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string }>;
};

export default async function LeagueTeamsPage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { season: seasonParam } = await searchParams;
  const user = await getCurrentUser();

  if (!(await leagueExists(leagueId))) notFound();

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) notFound();

  await getLeagueRole(leagueId, user);

  const seasons = await getLeagueSeasons(leagueId);
  if (seasons.length === 0) notFound();

  const seasonId =
    seasonParam && seasons.some((s) => s.id === seasonParam)
      ? seasonParam
      : pickDefaultSeasonId(seasons)!;

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const rosterCounts = await getTeamRosterCountsForSeason(seasonId);
  const teamIds = dash.teams.map(({ team }) => team.id);
  const highlights = await getTeamCardHighlightsForSeason(
    seasonId,
    teamIds,
    dash.games,
  );

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={league.name}
        title="Teams"
        subtitle="Managers, roster sizes, and records for each team."
      >
        {seasons.map((s) => (
          <Link
            key={s.id}
            href={`/leagues/${leagueId}/teams?season=${s.id}`}
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

      <SeasonHubTeamGrid
        leagueId={leagueId}
        seasonId={seasonId}
        teams={dash.teams}
        standings={dash.standings}
        rosterCounts={rosterCounts}
        highlights={highlights}
      />
    </PageShell>
  );
}
