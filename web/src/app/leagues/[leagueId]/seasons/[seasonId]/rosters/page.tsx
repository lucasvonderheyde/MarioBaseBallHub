import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, rosterInstances } from "@/db/schema";
import { RosterAssignmentBoard } from "@/components/RosterAssignmentBoard";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { PageShell } from "@/components/PageShell";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string }>;
  searchParams: Promise<{ e?: string }>;
};

export default async function RostersPage({ params, searchParams }: Props) {
  const { leagueId, seasonId } = await params;
  const { e } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") notFound();

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const instances = await db
    .select({
      instance: rosterInstances,
      character: characters,
    })
    .from(rosterInstances)
    .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
    .where(eq(rosterInstances.seasonId, seasonId))
    .orderBy(asc(characters.displayName), asc(rosterInstances.copyIndex));

  return (
    <PageShell width="wide">
      <Link
        href={`/leagues/${leagueId}/seasons/${seasonId}`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Back to season
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Roster assignment</h1>
      {e ? (
        <p className="mt-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-zinc-500">
        Click a character, then click a team to assign. Drag-and-drop still works.
        All teams are shown in a grid so nothing is hidden off-screen.
      </p>
      <RosterAssignmentBoard
        leagueId={leagueId}
        seasonId={seasonId}
        teams={dash.teams.map(({ team }) => ({ id: team.id, name: team.name }))}
        instances={instances.map(({ instance, character }) => ({
          id: instance.id,
          copyIndex: instance.copyIndex,
          teamId: instance.teamId,
          gameCharId: character.gameCharId,
          displayName: character.displayName,
          mugshotFile: character.mugshotFile,
        }))}
      />
    </PageShell>
  );
}
