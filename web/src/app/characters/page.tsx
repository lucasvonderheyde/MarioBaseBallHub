import { GlobalCharacterFilters } from "@/components/GlobalCharacterFilters";
import { GlobalCharactersNav } from "@/components/GlobalCharactersNav";
import { GlobalCharacterGrid } from "@/components/GlobalCharacterGrid";
import { GlobalCharacterPitchingGrid } from "@/components/GlobalCharacterPitchingGrid";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { matchesCharacterSearch } from "@/lib/character-search";
import {
  aggregateGlobalBattingByCharId,
  aggregateGlobalPitchingByCharId,
  getGlobalCharacterCatalog,
  getGlobalManagers,
} from "@/lib/global-character-stats";
import {
  parseCharacterLibrarySort,
  sortCharacterLibrary,
} from "@/lib/sort-character-library";
import {
  hasPitchingStats,
  parseCharacterLibraryPitchingSort,
  sortCharacterLibraryPitching,
} from "@/lib/sort-character-library-pitching";
import type { LeagueCharacterEntry } from "@/lib/league-characters";

type Props = {
  searchParams: Promise<{
    player?: string;
    q?: string;
    sort?: string;
    view?: string;
  }>;
};

function toSortableEntry(
  character: Awaited<ReturnType<typeof getGlobalCharacterCatalog>>[number],
): LeagueCharacterEntry {
  return {
    gameCharId: character.gameCharId,
    displayName: character.displayName,
    mugshotFile: character.mugshotFile,
    leagueCopies: 0,
    active: true,
  };
}

export default async function GlobalCharactersPage({ searchParams }: Props) {
  const {
    player: managerUserId,
    q: searchQuery,
    sort: sortParam,
    view: viewParam,
  } = await searchParams;

  const view = viewParam === "pitching" ? "pitching" : "batting";

  const [catalog, batting, pitching, managers] = await Promise.all([
    getGlobalCharacterCatalog(),
    aggregateGlobalBattingByCharId(managerUserId || undefined),
    view === "pitching"
      ? aggregateGlobalPitchingByCharId(managerUserId || undefined)
      : Promise.resolve(new Map()),
    getGlobalManagers(),
  ]);

  const query = searchQuery?.trim() ?? "";
  const filtered = query
    ? catalog.filter((character) => matchesCharacterSearch(character, query))
    : catalog;

  const battingSort = parseCharacterLibrarySort(sortParam);
  const pitchingSort = parseCharacterLibraryPitchingSort(sortParam);
  const sortable = filtered.map(toSortableEntry);

  const sorted =
    view === "pitching"
      ? sortCharacterLibraryPitching(sortable, pitching, pitchingSort)
      : sortCharacterLibrary(sortable, batting, battingSort);

  const sortedCatalog = sorted.map((entry) => ({
    gameCharId: entry.gameCharId,
    displayName: entry.displayName,
    mugshotFile: entry.mugshotFile,
  }));

  if (view === "pitching") {
    const withStats = sortedCatalog.filter((character) =>
      hasPitchingStats(pitching.get(character.gameCharId)),
    );
    const withoutStats = sortedCatalog.filter(
      (character) => !hasPitchingStats(pitching.get(character.gameCharId)),
    );

    return (
      <PageShell width="wide">
        <PageHero
          title="All-time characters"
          subtitle="Lifetime pitching stats for every Mario Superstar Baseball character across all leagues, seasons, and uploaded friendlies."
        />

        <GlobalCharactersNav active="library-pitching" />

        <GlobalCharacterFilters
          view="pitching"
          managerUserId={managerUserId}
          searchQuery={query}
          battingSort={battingSort}
          pitchingSort={pitchingSort}
          managers={managers}
        />

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Pitchers with stats</h2>
          <p className="text-sm text-zinc-500">
            Aggregated from every reported league game and lifetime batch upload.
            {query ? ` Showing matches for “${query}”.` : null}
          </p>
          {withStats.length > 0 ? (
            <GlobalCharacterPitchingGrid characters={withStats} pitching={pitching} />
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              {query
                ? "No pitchers with stats match your search."
                : "No pitching stats uploaded yet."}
            </p>
          )}
        </section>

        {withoutStats.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-zinc-400">No pitching stats yet</h2>
            <p className="text-sm text-zinc-600">
              Characters in the catalog that have not recorded a pitching appearance in
              uploaded games.
            </p>
            <GlobalCharacterPitchingGrid characters={withoutStats} pitching={pitching} />
          </section>
        ) : null}
      </PageShell>
    );
  }

  const withStats = sortedCatalog.filter(
    (character) => (batting.get(character.gameCharId)?.games ?? 0) > 0,
  );
  const withoutStats = sortedCatalog.filter(
    (character) => (batting.get(character.gameCharId)?.games ?? 0) === 0,
  );

  return (
    <PageShell width="wide">
      <PageHero
        title="All-time characters"
        subtitle="Lifetime hitting stats for every Mario Superstar Baseball character across all leagues, seasons, and uploaded friendlies."
      />

      <GlobalCharactersNav active="library" />

      <GlobalCharacterFilters
        view="batting"
        managerUserId={managerUserId}
        searchQuery={query}
        battingSort={battingSort}
        pitchingSort={pitchingSort}
        managers={managers}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Characters with stats</h2>
        <p className="text-sm text-zinc-500">
          Aggregated from every reported league game and lifetime batch upload.
          {query ? ` Showing matches for “${query}”.` : null}
        </p>
        {withStats.length > 0 ? (
          <GlobalCharacterGrid characters={withStats} batting={batting} />
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            {query
              ? "No characters with stats match your search."
              : "No character stats uploaded yet."}
          </p>
        )}
      </section>

      {withoutStats.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-400">No stats yet</h2>
          <p className="text-sm text-zinc-600">
            Characters in the catalog that have not appeared in uploaded games.
          </p>
          <GlobalCharacterGrid characters={withoutStats} batting={batting} />
        </section>
      ) : null}
    </PageShell>
  );
}
