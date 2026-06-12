"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CHARACTER_LIBRARY_PITCHING_SORT_OPTIONS,
  type CharacterLibraryPitchingSort,
} from "@/lib/sort-character-library-pitching";
import {
  CHARACTER_LIBRARY_SORT_OPTIONS,
  type CharacterLibrarySort,
} from "@/lib/sort-character-library";

export type CharacterLibraryView = "batting" | "pitching";

type Props = {
  view: CharacterLibraryView;
  managerUserId?: string;
  searchQuery?: string;
  battingSort: CharacterLibrarySort;
  pitchingSort: CharacterLibraryPitchingSort;
  managers: { id: string; username: string; displayName: string | null }[];
};

export function GlobalCharacterFilters({
  view,
  managerUserId,
  searchQuery,
  battingSort,
  pitchingSort,
  managers,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery ?? "");
  const sort = view === "pitching" ? pitchingSort : battingSort;

  useEffect(() => {
    setSearch(searchQuery ?? "");
  }, [searchQuery]);

  function navigate(
    nextView: CharacterLibraryView,
    nextPlayer: string,
    nextSearch: string,
    nextBattingSort: CharacterLibrarySort,
    nextPitchingSort: CharacterLibraryPitchingSort,
  ) {
    const params = new URLSearchParams();
    if (nextView === "pitching") params.set("view", "pitching");
    if (nextPlayer) params.set("player", nextPlayer);
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    if (nextView === "pitching") {
      if (nextPitchingSort !== "name") params.set("sort", nextPitchingSort);
    } else if (nextBattingSort !== "name") {
      params.set("sort", nextBattingSort);
    }
    const query = params.toString();
    router.push(`/characters${query ? `?${query}` : ""}`);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search === (searchQuery ?? "")) return;
      navigate(view, managerUserId ?? "", search, battingSort, pitchingSort);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, searchQuery, managerUserId, view, battingSort, pitchingSort]);

  const sortOptions =
    view === "pitching"
      ? CHARACTER_LIBRARY_PITCHING_SORT_OPTIONS
      : CHARACTER_LIBRARY_SORT_OPTIONS;

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
        <span className="text-xs text-zinc-500">Search</span>
        <input
          type="search"
          value={search}
          placeholder="Name or CharID…"
          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Manager</span>
        <select
          defaultValue={managerUserId ?? ""}
          className="min-w-[10rem] rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
          onChange={(event) =>
            navigate(view, event.target.value, search, battingSort, pitchingSort)
          }
        >
          <option value="">All managers</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.displayName ?? manager.username}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Sort by</span>
        <select
          value={sort}
          className="min-w-[10rem] rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
          onChange={(event) => {
            const nextSort = event.target.value;
            if (view === "pitching") {
              navigate(
                view,
                managerUserId ?? "",
                search,
                battingSort,
                nextSort as CharacterLibraryPitchingSort,
              );
            } else {
              navigate(
                view,
                managerUserId ?? "",
                search,
                nextSort as CharacterLibrarySort,
                pitchingSort,
              );
            }
          }}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.value !== "name"
                ? view === "pitching" && option.value === "era"
                  ? " (low → high)"
                  : " (high → low)"
                : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
