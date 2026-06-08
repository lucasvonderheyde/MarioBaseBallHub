import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import { CharacterLibraryFilters } from "@/components/CharacterLibraryFilters";
import { getCurrentUser } from "@/lib/auth";
import { formatCharIdDisplay } from "@/lib/character-display";
import { getLeagueRole } from "@/lib/league-access";
import {
  aggregateBattingByCharId,
  getDistinctCharsInLeague,
  getManagersInLeague,
} from "@/lib/game-stats-queries";
import { formatRate } from "@/domain/stats/batting-metrics";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string; player?: string }>;
};

export default async function CharacterLibraryPage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { season: seasonId, player: managerUserId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();

  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const charIds = await getDistinctCharsInLeague(leagueId, seasonId || undefined);
  const batting = await aggregateBattingByCharId({
    leagueId,
    seasonId: seasonId || undefined,
    managerUserId: managerUserId || undefined,
  });

  const managers = await getManagersInLeague(leagueId);

  const rows = charIds
    .map((charId) => ({ charId, line: batting.get(charId) }))
    .filter((r) => r.line != null)
    .sort((a, b) => a.charId.localeCompare(b.charId));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/leagues/${leagueId}`} className="text-sm text-zinc-500 hover:text-zinc-300">
        ← League
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Character library</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Characters that have appeared in uploaded game stats.
      </p>

      <CharacterLibraryFilters
        leagueId={leagueId}
        seasonId={seasonId}
        managerUserId={managerUserId}
        seasons={seasonRows}
        managers={managers}
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ charId, line }) => (
          <Link
            key={charId}
            href={`/leagues/${leagueId}/characters/${encodeURIComponent(charId)}${seasonId ? `?season=${seasonId}` : ""}`}
            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 hover:border-zinc-600"
          >
            <CharacterMugshot charId={charId} size={48} />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">{formatCharIdDisplay(charId)}</p>
              <p className="font-mono text-xs text-zinc-600">{charId}</p>
              {line ? (
                <p className="mt-1 text-xs text-zinc-400">
                  {line.games}G · {formatRate(line.ba)} · {line.hr} HR · {line.rbi} RBI
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">No character stats yet.</p>
      ) : null}
    </div>
  );
}
