import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { LeagueNav } from "@/components/LeagueNav";
import { db } from "@/db";
import { leagues, seasons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, isLeagueAdmin, leagueExists } from "@/lib/league-access";
import {
  pickDefaultSeasonId,
  sortSeasonsForDisplay,
} from "@/lib/league-season-sort";
import { getManagedTeamInSeason } from "@/lib/manager-team";

type Props = {
  children: React.ReactNode;
  params: Promise<{ leagueId: string }>;
};

export default async function LeagueLayout({ children, params }: Props) {
  const { leagueId } = await params;

  if (!(await leagueExists(leagueId))) notFound();

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) notFound();

  const user = await getCurrentUser();
  const role = user ? await getLeagueRole(leagueId, user) : null;
  const isMember = role != null;
  const isAdmin = isLeagueAdmin(role);

  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId))
    .orderBy(asc(seasons.createdAt));

  const sortedSeasons = sortSeasonsForDisplay(seasonRows);
  const activeSeasonId = pickDefaultSeasonId(sortedSeasons);
  const activeSeason = activeSeasonId
    ? sortedSeasons.find((season) => season.id === activeSeasonId) ?? null
    : null;

  const managedTeam =
    user && activeSeasonId
      ? await getManagedTeamInSeason(user.id, activeSeasonId)
      : null;

  return (
    <>
      <LeagueNav
        leagueId={leagueId}
        leagueName={league.name}
        activeSeasonId={activeSeasonId}
        activeSeasonName={activeSeason?.name ?? null}
        isMember={isMember}
        showClaim={!isAdmin}
        myTeamHref={
          managedTeam
            ? `/leagues/${leagueId}/seasons/${activeSeasonId}/teams/${managedTeam.id}`
            : null
        }
        myTeamName={managedTeam?.name ?? null}
      />
      {children}
    </>
  );
}
