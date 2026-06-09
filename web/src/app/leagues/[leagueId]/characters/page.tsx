import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leagues, seasons } from "@/db/schema";
import { CharacterLibraryFilters } from "@/components/CharacterLibraryFilters";
import { CharacterLibraryGrid } from "@/components/CharacterLibraryGrid";
import { PageHero } from "@/components/PageHero";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getLeagueCharacterLibrary } from "@/lib/league-characters";
import {
  aggregateBattingByCharId,
  getManagersInLeague,
} from "@/lib/game-stats-queries";
import { matchesCharacterSearch } from "@/lib/character-search";
import {
  parseCharacterLibrarySort,
  sortCharacterLibrary,
} from "@/lib/sort-character-library";
import { PageShell } from "@/components/PageShell";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string; player?: string; q?: string; sort?: string }>;
};

export default async function CharacterLibraryPage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const {
    season: seasonId,
    player: managerUserId,
    q: searchQuery,
    sort: sortParam,
  } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) notFound();

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

  const query = searchQuery?.trim() ?? "";
  const filteredActive = query
    ? active.filter((character) => matchesCharacterSearch(character, query))
    : active;
  const filteredInactive = query
    ? inactive.filter((character) => matchesCharacterSearch(character, query))
    : inactive;

  const sort = parseCharacterLibrarySort(sortParam);
  const sortedActive = sortCharacterLibrary(filteredActive, batting, sort);
  const sortedInactive = sortCharacterLibrary(filteredInactive, batting, sort);

  const seasonLabel = selectedSeason?.name ?? "any season";

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={league.name}
        title="Character library"
        subtitle={
          <>
            All characters in the league pool. Active characters are in use for{" "}
            {seasonId ? `"${selectedSeason!.name}"` : "at least one season"}; inactive
            characters are not in the pool or have zero copies.
          </>
        }
      />

      <CharacterLibraryFilters
        leagueId={leagueId}
        seasonId={seasonId}
        managerUserId={managerUserId}
        searchQuery={query}
        sort={sort}
        seasons={seasonRows}
        managers={managers}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Active characters</h2>
        <p className="text-sm text-zinc-500">
          In the league pool for {seasonLabel}.
          {query ? ` Showing matches for “${query}”.` : null}
        </p>
        {sortedActive.length > 0 ? (
          <CharacterLibraryGrid
            leagueId={leagueId}
            seasonId={seasonId}
            characters={sortedActive}
            batting={batting}
          />
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            {query
              ? "No active characters match your search."
              : "No active characters in the pool yet. Set league copies on the season admin page."}
          </p>
        )}
      </section>

      {inactive.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-400">Inactive characters</h2>
          <p className="text-sm text-zinc-600">
            Not in the pool for {seasonLabel}. You can still view their attributes and stats.
          </p>
          {sortedInactive.length > 0 ? (
            <CharacterLibraryGrid
              leagueId={leagueId}
              seasonId={seasonId}
              characters={sortedInactive}
              batting={batting}
              inactive
            />
          ) : query ? (
            <p className="mt-3 text-sm text-zinc-500">No inactive characters match your search.</p>
          ) : null}
        </section>
      ) : null}
    </PageShell>
  );
}
