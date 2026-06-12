"use client";

import { useRouter } from "next/navigation";
import type { H2hManagerOption, H2hSeasonOption, H2hSourceFilter } from "@/lib/head-to-head";

type Props = {
  managers: H2hManagerOption[];
  seasons: H2hSeasonOption[];
  managerAId: string;
  managerBId: string;
  seasonId: string;
  source: H2hSourceFilter;
};

export function HeadToHeadSelector({
  managers,
  seasons,
  managerAId,
  managerBId,
  seasonId,
  source,
}: Props) {
  const router = useRouter();

  function navigate(
    nextA: string,
    nextB: string,
    nextSeason: string,
    nextSource: H2hSourceFilter,
  ) {
    const params = new URLSearchParams();
    if (nextA) params.set("a", nextA);
    if (nextB) params.set("b", nextB);
    if (nextSeason) {
      params.set("season", nextSeason);
    } else if (nextSource !== "all") {
      params.set("source", nextSource);
    }
    const query = params.toString();
    router.push(`/h2h${query ? `?${query}` : ""}`);
  }

  function handleSeasonChange(nextSeason: string) {
    navigate(managerAId, managerBId, nextSeason, nextSeason ? "all" : source);
  }

  function handleSourceChange(nextSource: H2hSourceFilter) {
    navigate(managerAId, managerBId, "", nextSource);
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm text-zinc-400">
        Manager A
        <select
          value={managerAId}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          onChange={(event) =>
            navigate(event.target.value, managerBId, seasonId, source)
          }
        >
          <option value="">Select manager…</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.displayName ?? manager.username}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-400">
        Manager B
        <select
          value={managerBId}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          onChange={(event) =>
            navigate(managerAId, event.target.value, seasonId, source)
          }
        >
          <option value="">Select manager…</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.displayName ?? manager.username}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-400">
        Season
        <select
          value={seasonId}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          onChange={(event) => handleSeasonChange(event.target.value)}
        >
          <option value="">All seasons / lifetime</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.leagueName} · {season.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-400">
        Game type
        <select
          value={seasonId ? "all" : source}
          disabled={Boolean(seasonId)}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 disabled:opacity-60"
          onChange={(event) =>
            handleSourceChange(event.target.value as H2hSourceFilter)
          }
        >
          <option value="all">Seasons + friendlies</option>
          <option value="league">Seasons only</option>
          <option value="friendly">Friendlies only</option>
        </select>
      </label>
    </form>
  );
}
