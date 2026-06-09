import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { STADIUM_CATALOG } from "@/data/character-catalog";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getStadiumGameCounts } from "@/lib/game-stats-queries";
import { stadiumIconUrl } from "@/lib/asset-urls";
import { PageShell } from "@/components/PageShell";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string }>;
};

export default async function StadiumLibraryPage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { season: seasonId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();

  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const counts = await getStadiumGameCounts(leagueId, seasonId || undefined);

  return (
    <PageShell width="wide">
      <h1 className="text-2xl font-bold">Stadium library</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Game counts and stats use the <span className="font-mono text-zinc-400">StadiumID</span>{" "}
        field from each uploaded game JSON.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/leagues/${leagueId}/stadiums`}
          className={`rounded px-2 py-0.5 ${!seasonId ? "bg-zinc-700" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          All seasons
        </Link>
        {seasonRows.map((s) => (
          <Link
            key={s.id}
            href={`/leagues/${leagueId}/stadiums?season=${s.id}`}
            className={`rounded px-2 py-0.5 ${seasonId === s.id ? "bg-zinc-700" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {STADIUM_CATALOG.map((stadium) => {
          const played = counts.get(stadium.gameStadiumId) ?? 0;
          return (
            <Link
              key={stadium.gameStadiumId}
              href={`/leagues/${leagueId}/stadiums/${encodeURIComponent(stadium.gameStadiumId)}${seasonId ? `?season=${seasonId}` : ""}`}
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-600"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stadiumIconUrl(stadium.iconFile)}
                alt=""
                width={64}
                height={64}
                className="rounded"
              />
              <div>
                <p className="font-medium">{stadium.gameStadiumId}</p>
                <p className="text-sm text-zinc-500">{played} games played</p>
              </div>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
