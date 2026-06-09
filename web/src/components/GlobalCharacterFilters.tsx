"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CHARACTER_LIBRARY_SORT_OPTIONS,
  type CharacterLibrarySort,
} from "@/lib/sort-character-library";

type Props = {
  managerUserId?: string;
  searchQuery?: string;
  sort: CharacterLibrarySort;
  managers: { id: string; username: string; displayName: string | null }[];
};

export function GlobalCharacterFilters({
  managerUserId,
  searchQuery,
  sort,
  managers,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery ?? "");

  useEffect(() => {
    setSearch(searchQuery ?? "");
  }, [searchQuery]);

  function navigate(
    nextPlayer: string,
    nextSearch: string,
    nextSort: CharacterLibrarySort,
  ) {
    const params = new URLSearchParams();
    if (nextPlayer) params.set("player", nextPlayer);
    if (nextSearch.trim()) params.set("q", nextSearch.trim());
    if (nextSort !== "name") params.set("sort", nextSort);
    const query = params.toString();
    router.push(`/characters${query ? `?${query}` : ""}`);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search === (searchQuery ?? "")) return;
      navigate(managerUserId ?? "", search, sort);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, searchQuery, managerUserId, sort]);

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
          onChange={(event) => navigate(event.target.value, search, sort)}
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
          onChange={(event) =>
            navigate(
              managerUserId ?? "",
              search,
              event.target.value as CharacterLibrarySort,
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
