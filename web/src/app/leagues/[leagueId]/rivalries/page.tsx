import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leagues } from "@/db/schema";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { SectionHeading } from "@/components/SectionHeading";
import { getLeagueRivalries } from "@/lib/league-rivalries";

type Props = {
  params: Promise<{ leagueId: string }>;
};

function heatLabel(rank: number): string {
  if (rank === 0) return "🔥 Hottest rivalry";
  if (rank === 1) return "🔥 Heating up";
  return "";
}

export default async function LeagueRivalriesPage({ params }: Props) {
  const { leagueId } = await params;

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) notFound();

  const rivalries = await getLeagueRivalries(leagueId);

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={league.name}
        title="League rivalries"
        subtitle="Manager-vs-manager history across every season — ranked by meetings, closeness, and how tight the series is."
      />

      {rivalries.length > 0 ? (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {rivalries.map((rivalry, index) => {
            const seriesLeader =
              rivalry.aWins === rivalry.bWins
                ? null
                : rivalry.aWins > rivalry.bWins
                  ? rivalry.managerA.name
                  : rivalry.managerB.name;
            return (
              <li
                key={`${rivalry.managerA.id}-${rivalry.managerB.id}`}
                className="msb-panel p-5"
              >
                {heatLabel(index) ? (
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-300">
                    {heatLabel(index)}
                  </p>
                ) : null}
                <SectionHeading className="mt-1">
                  {rivalry.managerA.name}
                  <span className="mx-2 text-zinc-600">vs</span>
                  {rivalry.managerB.name}
                </SectionHeading>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {rivalry.aWins}
                  <span className="mx-2 text-lg text-zinc-600">–</span>
                  {rivalry.bWins}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {seriesLeader
                    ? `${seriesLeader} leads the series`
                    : "Series tied"}{" "}
                  · {rivalry.games} game{rivalry.games === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Runs {rivalry.totalRunsA}–{rivalry.totalRunsB} · avg margin{" "}
                  {rivalry.avgMargin.toFixed(1)}
                  {rivalry.lastPlayedAt
                    ? ` · last met ${rivalry.lastPlayedAt.toLocaleDateString()}`
                    : ""}
                </p>
                <Link
                  href={`/h2h?a=${rivalry.managerA.id}&b=${rivalry.managerB.id}`}
                  className="msb-link mt-3 inline-block text-xs"
                >
                  Full head-to-head →
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="msb-empty-state mt-8">
          <p className="text-sm text-zinc-500">No rivalries yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Rivalries appear once managers have played each other.
          </p>
        </div>
      )}
    </PageShell>
  );
}
