import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leagues, seasons } from "@/db/schema";
import { CharacterLibraryFilters } from "@/components/CharacterLibraryFilters";
import { CharacterLibraryGrid } from "@/components/CharacterLibraryGrid";
import { PageHero } from "@/components/PageHero";
import { SectionHeading } from "@/components/SectionHeading";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getLeagueCharacterLibrary } from "@/lib/league-characters";
import {
  aggregateBattingByCharId,
  aggregatePitchingByCharId,
  getManagersInLeague,
} from "@/lib/game-stats-queries";
import { matchesCharacterSearch } from "@/lib/character-search";
import {
  parseCharacterLibrarySort,
  sortCharacterLibrary,
} from "@/lib/sort-character-library";
import {
  hasPitchingStats,
  parseCharacterLibraryPitchingSort,
  sortCharacterLibraryPitching,
} from "@/lib/sort-character-library-pitching";
import { GlobalCharacterPitchingGrid } from "@/components/GlobalCharacterPitchingGrid";
import { CharacterSeasonSnapshotTable } from "@/components/CharacterSeasonSnapshotTable";
import type { PitchingLine } from "@/lib/game-stats-queries";
import { PageShell } from "@/components/PageShell";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{
    season?: string;
    player?: string;
    q?: string;
    sort?: string;
    view?: string;
  }>;
};

export default async function CharacterLibraryPage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const {
    season: seasonId,
    player: managerUserId,
    q: searchQuery,
    sort: sortParam,
    view: viewParam,
  } = await searchParams;
  const view =
    viewParam === "pitching" || viewParam === "table" ? viewParam : "batting";
  const user = await getCurrentUser();

  const role = await getLeagueRole(leagueId, user);

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
  const statFilter = {
    leagueId,
    seasonId: seasonId || undefined,
    managerUserId: managerUserId || undefined,
  };
  const batting = await aggregateBattingByCharId(statFilter);
  const pitching =
    view === "pitching" || view === "table"
      ? await aggregatePitchingByCharId(statFilter)
      : new Map<string, PitchingLine>();
  const managers = await getManagersInLeague(leagueId);

  const query = searchQuery?.trim() ?? "";
  const filteredActive = query
    ? active.filter((character) => matchesCharacterSearch(character, query))
    : active;
  const filteredInactive = query
    ? inactive.filter((character) => matchesCharacterSearch(character, query))
    : inactive;

  const sort = parseCharacterLibrarySort(sortParam);
  const pitchingSort = parseCharacterLibraryPitchingSort(sortParam);
  const sortedActive =
    view === "pitching"
      ? sortCharacterLibraryPitching(filteredActive, pitching, pitchingSort)
      : sortCharacterLibrary(filteredActive, batting, sort);
  const sortedInactive =
    view === "pitching"
      ? sortCharacterLibraryPitching(filteredInactive, pitching, pitchingSort)
      : sortCharacterLibrary(filteredInactive, batting, sort);

  const seasonLabel = selectedSeason?.name ?? "any season";

  function viewHref(
    nextView: "batting" | "pitching" | "table",
    nextSort?: string,
  ): string {
    const params = new URLSearchParams();
    if (seasonId) params.set("season", seasonId);
    if (managerUserId) params.set("player", managerUserId);
    if (query) params.set("q", query);
    if (nextView !== "batting") params.set("view", nextView);
    if (nextSort && nextSort !== "name") params.set("sort", nextSort);
    const qs = params.toString();
    return `/leagues/${leagueId}/characters${qs ? `?${qs}` : ""}`;
  }

  const leagueCharHref = (gameCharId: string) =>
    `/leagues/${leagueId}/characters/${encodeURIComponent(gameCharId)}${
      seasonId ? `?season=${seasonId}&tab=pitching` : "?tab=pitching"
    }`;

  const viewTabClass = (isActive: boolean) =>
    isActive ? "msb-btn-nav msb-btn-nav-active text-xs" : "msb-btn-nav text-xs";

  const activeWithPitching =
    view === "pitching"
      ? sortedActive.filter((character) =>
          hasPitchingStats(pitching.get(character.gameCharId)),
        )
      : [];
  const activeWithoutPitching =
    view === "pitching"
      ? sortedActive.filter(
          (character) => !hasPitchingStats(pitching.get(character.gameCharId)),
        )
      : [];

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

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={viewHref("batting")} className={viewTabClass(view === "batting")}>
          Batting
        </Link>
        <Link href={viewHref("pitching")} className={viewTabClass(view === "pitching")}>
          Pitching
        </Link>
        <Link href={viewHref("table")} className={viewTabClass(view === "table")}>
          Season table
        </Link>
      </div>

      <CharacterLibraryFilters
        leagueId={leagueId}
        seasonId={seasonId}
        managerUserId={managerUserId}
        searchQuery={query}
        sort={sort}
        seasons={seasonRows}
        managers={managers}
      />

      {view === "table" ? (
        <section className="mt-10">
          <SectionHeading>Season snapshot</SectionHeading>
          <p className="text-sm text-zinc-500">
            Every character in one sortable table for {seasonLabel} — batting
            plus core pitching.
            {query ? ` Showing matches for “${query}”.` : null}
          </p>
          <CharacterSeasonSnapshotTable
            characters={[...sortedActive, ...sortedInactive]}
            batting={batting}
            pitching={pitching}
            leagueId={leagueId}
            seasonId={seasonId}
            sort={sort}
            sortHref={(nextSort) => viewHref("table", nextSort)}
          />
        </section>
      ) : view === "pitching" ? (
        <>
          <section className="mt-10">
            <SectionHeading>Pitchers with stats</SectionHeading>
            <p className="text-sm text-zinc-500">
              Active characters with pitching appearances for {seasonLabel}.
              {query ? ` Showing matches for “${query}”.` : null}
            </p>
            {activeWithPitching.length > 0 ? (
              <GlobalCharacterPitchingGrid
                characters={activeWithPitching}
                pitching={pitching}
                hrefFor={leagueCharHref}
              />
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                {query
                  ? "No pitchers with stats match your search."
                  : "No pitching stats for active characters yet."}
              </p>
            )}
          </section>

          {activeWithoutPitching.length > 0 ? (
            <section className="mt-10">
              <SectionHeading className="msb-section-title-muted">
                No pitching stats yet
              </SectionHeading>
              <p className="text-sm text-zinc-600">
                Active characters in the pool that have not recorded a pitching
                appearance for {seasonLabel}.
              </p>
              <GlobalCharacterPitchingGrid
                characters={activeWithoutPitching}
                pitching={pitching}
                hrefFor={leagueCharHref}
              />
            </section>
          ) : null}

          {inactive.length > 0 ? (
            <section className="mt-10">
              <SectionHeading className="msb-section-title-muted">
                Inactive characters
              </SectionHeading>
              <p className="text-sm text-zinc-600">
                Not in the pool for {seasonLabel}. You can still view their
                attributes and stats.
              </p>
              {sortedInactive.length > 0 ? (
                <GlobalCharacterPitchingGrid
                  characters={sortedInactive}
                  pitching={pitching}
                  hrefFor={leagueCharHref}
                />
              ) : query ? (
                <p className="mt-3 text-sm text-zinc-500">
                  No inactive characters match your search.
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      ) : (
      <>
      <section className="mt-10">
        <SectionHeading>Active characters</SectionHeading>
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
          <SectionHeading className="msb-section-title-muted">Inactive characters</SectionHeading>
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
      </>
      )}
    </PageShell>
  );
}
