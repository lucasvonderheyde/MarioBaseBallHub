"use client";

import { useRouter } from "next/navigation";

type Props = {
  leagueId: string;
  seasonId?: string;
  managerUserId?: string;
  seasons: { id: string; name: string }[];
  managers: { id: string; username: string }[];
};

export function CharacterLibraryFilters({
  leagueId,
  seasonId,
  managerUserId,
  seasons,
  managers,
}: Props) {
  const router = useRouter();

  function navigate(nextSeason: string, nextPlayer: string) {
    const params = new URLSearchParams();
    if (nextSeason) params.set("season", nextSeason);
    if (nextPlayer) params.set("player", nextPlayer);
    const q = params.toString();
    router.push(
      `/leagues/${leagueId}/characters${q ? `?${q}` : ""}`,
    );
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Season</span>
        <select
          defaultValue={seasonId ?? ""}
          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
          onChange={(e) => navigate(e.target.value, managerUserId ?? "")}
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
          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1"
          onChange={(e) => navigate(seasonId ?? "", e.target.value)}
        >
          <option value="">All managers</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.username}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
