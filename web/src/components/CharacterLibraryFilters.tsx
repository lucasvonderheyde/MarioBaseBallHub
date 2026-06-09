"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CHARACTER_LIBRARY_SORT_OPTIONS,
  type CharacterLibrarySort,
} from "@/lib/sort-character-library";

type Props = {
  leagueId: string;
  seasonId?: string;
  managerUserId?: string;
  searchQuery?: string;
  sort: CharacterLibrarySort;
  seasons: { id: string; name: string }[];
  managers: { id: string; username: string }[];
};

export function CharacterLibraryFilters({
  leagueId,
  seasonId,
  managerUserId,
  searchQuery,
  sort,
  seasons,
  managers,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery ?? "");

  useEffect(() => {
    setSearch(searchQuery ?? "");
  }, [searchQuery]);

  function navigate(
    nextSeason: string,
    nextPlayer: string,
    nextSearch: string,
    nextSort: CharacterLibrarySort,
  ) {
    const params = new URLSearchParams();
    if (nextSeason) params.set("season", nextSeason);
    if (nextPlayer) params.set("player", nextPlayer);
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    if (nextSort !== "name") params.set("sort", nextSort);
    const q = params.toString();
    router.push(`/leagues/${leagueId}/characters${q ? `?${q}` : ""}`);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search === (searchQuery ?? "")) return;
      navigate(seasonId ?? "", managerUserId ?? "", search, sort);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, searchQuery, seasonId, managerUserId, sort]);

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
            navigate(e.target.value, managerUserId ?? "", search, sort)
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
            navigate(seasonId ?? "", e.target.value, search, sort)
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
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Sort by</span>
        <select
          value={sort}
          className="min-w-[10rem] rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
          onChange={(e) =>
            navigate(
              seasonId ?? "",
              managerUserId ?? "",
              search,
              e.target.value as CharacterLibrarySort,
            )
          }
        >
          {CHARACTER_LIBRARY_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.value !== "name" ? " (high → low)" : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
