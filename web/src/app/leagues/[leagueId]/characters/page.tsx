import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { CharacterLibraryFilters } from "@/components/CharacterLibraryFilters";
import { CharacterLibraryGrid } from "@/components/CharacterLibraryGrid";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getLeagueCharacterLibrary } from "@/lib/league-characters";
import {
  aggregateBattingByCharId,
  getManagersInLeague,
} from "@/lib/game-stats-queries";
import { PageShell } from "@/components/PageShell";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string; player?: string }>;
};

export default async function CharacterLibraryPage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { season: seasonId, player: managerUserId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();

  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const selectedSeason = seasonId
    ? seasonRows.find((season) => season.id === seasonId)
    : null;
  if (seasonId && !selectedSeason) notFound();

  const { active, inactive } = await getLeagueCharacterLibrary(leagueId, seasonId || undefined);
  const batting = await aggregateBattingByCharId({
    leagueId,
    seasonId: seasonId || undefined,
    managerUserId: managerUserId || undefined,
  });
  const managers = await getManagersInLeague(leagueId);

  const seasonLabel = selectedSeason?.name ?? "any season";

  return (
    <PageShell width="wide">
      <Link href={`/leagues/${leagueId}`} className="text-sm text-zinc-500 hover:text-zinc-300">
        ← League
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Character library</h1>
      <p className="mt-1 text-sm text-zinc-500">
        All characters in the league pool. Active characters are in use for{" "}
        {seasonId ? `"${selectedSeason!.name}"` : "at least one season"}; inactive
        characters are not in the pool or have zero copies.
      </p>

      <CharacterLibraryFilters
        leagueId={leagueId}
        seasonId={seasonId}
        managerUserId={managerUserId}
        seasons={seasonRows}
        managers={managers}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Active characters</h2>
        <p className="text-sm text-zinc-500">
          In the league pool for {seasonLabel}.
        </p>
        {active.length > 0 ? (
          <CharacterLibraryGrid
            leagueId={leagueId}
            seasonId={seasonId}
            characters={active}
            batting={batting}
          />
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            No active characters in the pool yet. Set league copies on the season admin page.
          </p>
        )}
      </section>

      {inactive.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-400">Inactive characters</h2>
          <p className="text-sm text-zinc-600">
            Not in the pool for {seasonLabel}. You can still view their attributes and stats.
          </p>
          <CharacterLibraryGrid
            leagueId={leagueId}
            seasonId={seasonId}
            characters={inactive}
            batting={batting}
            inactive
          />
        </section>
      ) : null}
    </PageShell>
  );
}
