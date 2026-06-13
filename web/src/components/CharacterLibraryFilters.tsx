"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CHARACTER_LIBRARY_FIELDING_SORT_OPTIONS,
  type CharacterLibraryFieldingSort,
} from "@/lib/sort-character-library-fielding";
import {
  CHARACTER_LIBRARY_PITCHING_SORT_OPTIONS,
  type CharacterLibraryPitchingSort,
} from "@/lib/sort-character-library-pitching";
import {
  CHARACTER_LIBRARY_SORT_OPTIONS,
  type CharacterLibrarySort,
} from "@/lib/sort-character-library";

export type LeagueCharacterLibraryView = "batting" | "pitching" | "fielding" | "table";

type Props = {
  leagueId: string;
  seasonId?: string;
  managerUserId?: string;
  searchQuery?: string;
  view: LeagueCharacterLibraryView;
  battingSort: CharacterLibrarySort;
  pitchingSort: CharacterLibraryPitchingSort;
  fieldingSort: CharacterLibraryFieldingSort;
  seasons: { id: string; name: string }[];
  managers: { id: string; username: string }[];
};

export function CharacterLibraryFilters({
  leagueId,
  seasonId,
  managerUserId,
  searchQuery,
  view,
  battingSort,
  pitchingSort,
  fieldingSort,
  seasons,
  managers,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery ?? "");
  const sort =
    view === "pitching"
      ? pitchingSort
      : view === "fielding"
        ? fieldingSort
        : battingSort;

  useEffect(() => {
    setSearch(searchQuery ?? "");
  }, [searchQuery]);

  function navigate(
    nextSeason: string,
    nextPlayer: string,
    nextSearch: string,
    nextBattingSort: CharacterLibrarySort,
    nextPitchingSort: CharacterLibraryPitchingSort,
    nextFieldingSort: CharacterLibraryFieldingSort,
  ) {
    const params = new URLSearchParams();
    if (nextSeason) params.set("season", nextSeason);
    if (nextPlayer) params.set("player", nextPlayer);
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    if (view !== "batting") params.set("view", view);
    if (view === "pitching") {
      if (nextPitchingSort !== "name") params.set("sort", nextPitchingSort);
    } else if (view === "fielding") {
      if (nextFieldingSort !== "name") params.set("sort", nextFieldingSort);
    } else if (nextBattingSort !== "name") {
      params.set("sort", nextBattingSort);
    }
    const q = params.toString();
    router.push(`/leagues/${leagueId}/characters${q ? `?${q}` : ""}`);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search === (searchQuery ?? "")) return;
      navigate(seasonId ?? "", managerUserId ?? "", search, battingSort, pitchingSort, fieldingSort);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, searchQuery, seasonId, managerUserId, view, battingSort, pitchingSort, fieldingSort]);

  const sortOptions =
    view === "pitching"
      ? CHARACTER_LIBRARY_PITCHING_SORT_OPTIONS
      : view === "fielding"
        ? CHARACTER_LIBRARY_FIELDING_SORT_OPTIONS
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
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Season</span>
        <select
          defaultValue={seasonId ?? ""}
          className="min-w-[10rem] rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
          onChange={(e) =>
            navigate(e.target.value, managerUserId ?? "", search, battingSort, pitchingSort, fieldingSort)
          }
        >
          <option value="">All seasons</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Manager</span>
        <select
          defaultValue={managerUserId ?? ""}
          className="min-w-[10rem] rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
          onChange={(e) =>
            navigate(seasonId ?? "", e.target.value, search, battingSort, pitchingSort, fieldingSort)
          }
        >
          <option value="">All managers</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.username}
            </option>
          ))}
        </select>
      </label>
      {view !== "table" ? (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Sort by</span>
          <select
            value={sort}
            className="min-w-[10rem] rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
            onChange={(e) => {
              const nextSort = e.target.value;
              if (view === "pitching") {
                navigate(
                  seasonId ?? "",
                  managerUserId ?? "",
                  search,
                  battingSort,
                  nextSort as CharacterLibraryPitchingSort,
                  fieldingSort,
                );
              } else if (view === "fielding") {
                navigate(
                  seasonId ?? "",
                  managerUserId ?? "",
                  search,
                  battingSort,
                  pitchingSort,
                  nextSort as CharacterLibraryFieldingSort,
                );
              } else {
                navigate(
                  seasonId ?? "",
                  managerUserId ?? "",
                  search,
                  nextSort as CharacterLibrarySort,
                  pitchingSort,
                  fieldingSort,
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
      ) : null}
    </div>
  );
}
