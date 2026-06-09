import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import type { seasons } from "@/db/schema";

type SeasonRow = typeof seasons.$inferSelect;

type Props = {
  leagueId: string;
  leagueName: string;
  activeSeason: SeasonRow | null;
};

/** Read-only league landing for managers and visitors (non-admin). */
export function LeaguePublicHub({ leagueId, leagueName, activeSeason }: Props) {
  return (
    <PageShell width="default">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">{leagueName}</h1>
        <Link href="/leagues" className="text-sm text-zinc-400 hover:text-white">
          Your leagues
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        League schedule and standings. Contact the commissioner for team setup.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/leagues/${leagueId}/schedule`} className="msb-btn-nav">
          Schedule
        </Link>
        <Link href={`/leagues/${leagueId}/playoffs`} className="msb-btn-nav">
          Playoff picture
        </Link>
        <Link href={`/leagues/${leagueId}/claim`} className="msb-btn-nav">
          Claim a team
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Current season</h2>
        {activeSeason ? (
          <Link
            href={`/leagues/${leagueId}/seasons/${activeSeason.id}`}
            className="mt-3 block rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-4 hover:border-amber-600"
          >
            <span className="text-lg font-medium text-amber-100">
              {activeSeason.name}
            </span>
            <span className="ml-2 text-sm capitalize text-amber-400/80">
              {activeSeason.status}
            </span>
            <p className="mt-1 text-sm text-zinc-500">
              View standings and games →
            </p>
          </Link>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No season published yet.</p>
        )}
      </section>
    </PageShell>
  );
}
