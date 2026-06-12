import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { SeasonRecordsPanel } from "@/components/season/SeasonRecordsPanel";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { getSeasonRecords } from "@/lib/season-records";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string }>;
};

export default async function SeasonRecordsPage({ params }: Props) {
  const { leagueId, seasonId } = await params;
  const user = await getCurrentUser();

  const role = await getLeagueRole(leagueId, user);

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const records = await getSeasonRecords(seasonId);

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={dash.league.name}
        title={`${dash.season.name} records`}
        subtitle="Single-game highs from every uploaded box score this season."
      />

      <p className="-mt-4 mb-6 text-center">
        <Link
          href={`/leagues/${leagueId}/seasons/${seasonId}`}
          className="text-sm text-amber-400 hover:underline"
        >
          ← Back to season hub
        </Link>
      </p>

      <SeasonRecordsPanel
        leagueId={leagueId}
        seasonId={seasonId}
        records={records}
      />
    </PageShell>
  );
}
