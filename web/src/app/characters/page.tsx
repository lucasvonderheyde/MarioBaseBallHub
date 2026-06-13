import { GlobalCharacterFieldingGrid } from "@/components/GlobalCharacterFieldingGrid";
import { GlobalCharacterFilters } from "@/components/GlobalCharacterFilters";
import { GlobalCharactersNav } from "@/components/GlobalCharactersNav";
import { GlobalCharacterGrid } from "@/components/GlobalCharacterGrid";
import { GlobalCharacterPitchingGrid } from "@/components/GlobalCharacterPitchingGrid";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { SectionHeading } from "@/components/SectionHeading";
import { matchesCharacterSearch } from "@/lib/character-search";
import {
  aggregateGlobalBattingByCharId,
  aggregateGlobalFieldingByCharId,
  aggregateGlobalPitchingByCharId,
  getGlobalCharacterCatalog,
  getGlobalManagers,
} from "@/lib/global-character-stats";
import {
  parseCharacterLibrarySort,
  sortCharacterLibrary,
} from "@/lib/sort-character-library";
import {
  hasFieldingStats,
  parseCharacterLibraryFieldingSort,
  sortCharacterLibraryFielding,
} from "@/lib/sort-character-library-fielding";
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

function parseView(
  viewParam: string | undefined,
): "batting" | "pitching" | "fielding" {
  if (viewParam === "pitching") return "pitching";
  if (viewParam === "fielding") return "fielding";
  return "batting";
}

export default async function GlobalCharactersPage({ searchParams }: Props) {
  const {
    player: managerUserId,
    q: searchQuery,
    sort: sortParam,
    view: viewParam,
  } = await searchParams;

  const view = parseView(viewParam);

  const [catalog, batting, pitching, fielding, managers] = await Promise.all([
    getGlobalCharacterCatalog(),
    aggregateGlobalBattingByCharId(managerUserId || undefined),
    view === "pitching"
      ? aggregateGlobalPitchingByCharId(managerUserId || undefined)
      : Promise.resolve(new Map()),
    view === "fielding"
      ? aggregateGlobalFieldingByCharId(managerUserId || undefined)
      : Promise.resolve(new Map()),
    getGlobalManagers(),
  ]);

  const query = searchQuery?.trim() ?? "";
  const filtered = query
    ? catalog.filter((character) => matchesCharacterSearch(character, query))
    : catalog;

  const battingSort = parseCharacterLibrarySort(sortParam);
  const pitchingSort = parseCharacterLibraryPitchingSort(sortParam);
  const fieldingSort = parseCharacterLibraryFieldingSort(sortParam);
  const sortable = filtered.map(toSortableEntry);

  const sorted =
    view === "pitching"
      ? sortCharacterLibraryPitching(sortable, pitching, pitchingSort)
      : view === "fielding"
        ? sortCharacterLibraryFielding(sortable, fielding, fieldingSort)
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
          fieldingSort={fieldingSort}
          managers={managers}
        />

        <section className="mt-10">
          <SectionHeading>Pitchers with stats</SectionHeading>
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
            <SectionHeading className="msb-section-title-muted">
              No pitching stats yet
            </SectionHeading>
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

  if (view === "fielding") {
    const withStats = sortedCatalog.filter((character) =>
      hasFieldingStats(fielding.get(character.gameCharId)),
    );
    const withoutStats = sortedCatalog.filter(
      (character) => !hasFieldingStats(fielding.get(character.gameCharId)),
    );

    return (
      <PageShell width="wide">
        <PageHero
          title="All-time characters"
          subtitle="Lifetime fielding stats for every Mario Superstar Baseball character across all reported league games."
        />

        <GlobalCharactersNav active="library-fielding" />

        <GlobalCharacterFilters
          view="fielding"
          managerUserId={managerUserId}
          searchQuery={query}
          battingSort={battingSort}
          pitchingSort={pitchingSort}
          fieldingSort={fieldingSort}
          managers={managers}
        />

        <section className="mt-10">
          <SectionHeading>Fielders with stats</SectionHeading>
          <p className="text-sm text-zinc-500">
            Aggregated from every reported league game with defensive stats.
            {query ? ` Showing matches for “${query}”.` : null}
          </p>
          {withStats.length > 0 ? (
            <GlobalCharacterFieldingGrid characters={withStats} fielding={fielding} />
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              {query
                ? "No fielders with stats match your search."
                : "No fielding stats uploaded yet."}
            </p>
          )}
        </section>

        {withoutStats.length > 0 ? (
          <section className="mt-10">
            <SectionHeading className="msb-section-title-muted">
              No fielding stats yet
            </SectionHeading>
            <p className="text-sm text-zinc-600">
              Characters in the catalog that have not recorded defensive stats in uploaded
              league games.
            </p>
            <GlobalCharacterFieldingGrid characters={withoutStats} fielding={fielding} />
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
        fieldingSort={fieldingSort}
        managers={managers}
      />

      <section className="mt-10">
        <SectionHeading>Characters with stats</SectionHeading>
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
          <SectionHeading className="msb-section-title-muted">No stats yet</SectionHeading>
          <p className="text-sm text-zinc-600">
            Characters in the catalog that have not appeared in uploaded games.
          </p>
          <GlobalCharacterGrid characters={withoutStats} batting={batting} />
        </section>
      ) : null}
    </PageShell>
  );
}
