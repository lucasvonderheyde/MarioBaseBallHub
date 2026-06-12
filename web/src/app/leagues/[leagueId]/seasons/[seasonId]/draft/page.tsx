import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { DraftBoard } from "@/components/draft/DraftBoard";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { db } from "@/db";
import { characters, rosterInstances, seasons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getManagedTeamInSeason } from "@/lib/manager-team";
import { getSeasonDraftView } from "@/lib/season-draft";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string }>;
};

export default async function SeasonDraftPage({ params }: Props) {
  const { leagueId, seasonId } = await params;
  const user = await getCurrentUser();

  const role = await getLeagueRole(leagueId, user);

  const [season] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.id, seasonId), eq(seasons.leagueId, leagueId)))
    .limit(1);
  if (!season) notFound();

  const draft = await getSeasonDraftView(seasonId);
  const userTeam = user ? await getManagedTeamInSeason(user.id, seasonId) : null;

  const available = await db
    .select({
      id: rosterInstances.id,
      gameCharId: characters.gameCharId,
      displayName: characters.displayName,
      copyIndex: rosterInstances.copyIndex,
    })
    .from(rosterInstances)
    .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
    .where(
      and(eq(rosterInstances.seasonId, seasonId), isNull(rosterInstances.teamId)),
    )
    .orderBy(asc(characters.displayName), asc(rosterInstances.copyIndex));

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={season.name}
        title="Season draft"
        subtitle="Snake draft for roster building. Available during season setup; locks when the season goes active."
      >
        <Link
          href={`/leagues/${leagueId}/seasons/${seasonId}`}
          className="msb-link text-sm"
        >
          ← Season hub
        </Link>
      </PageHero>

      <DraftBoard
        leagueId={leagueId}
        seasonId={seasonId}
        seasonStatus={season.status}
        isAdmin={role === "admin"}
        userTeamId={userTeam?.id ?? null}
        draft={draft}
        available={available}
      />
    </PageShell>
  );
}
