"use client";

import { useRouter } from "next/navigation";
import type { H2hManagerOption, H2hSeasonOption } from "@/lib/head-to-head";

type Props = {
  managers: H2hManagerOption[];
  seasons: H2hSeasonOption[];
  managerAId: string;
  managerBId: string;
  seasonId: string;
};

export function HeadToHeadSelector({
  managers,
  seasons,
  managerAId,
  managerBId,
  seasonId,
}: Props) {
  const router = useRouter();

  function navigate(nextA: string, nextB: string, nextSeason: string) {
    const params = new URLSearchParams();
    if (nextA) params.set("a", nextA);
    if (nextB) params.set("b", nextB);
    if (nextSeason) params.set("season", nextSeason);
    const query = params.toString();
    router.push(`/h2h${query ? `?${query}` : ""}`);
  }

  return (
    <form className="grid gap-4 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-sm text-zinc-400">
        Manager A
        <select
          value={managerAId}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          onChange={(event) =>
            navigate(event.target.value, managerBId, seasonId)
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
            navigate(managerAId, event.target.value, seasonId)
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
        Scope
        <select
          value={seasonId}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          onChange={(event) =>
            navigate(managerAId, managerBId, event.target.value)
          }
        >
          <option value="">Lifetime (all leagues + friendlies)</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.leagueName} · {season.name}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
