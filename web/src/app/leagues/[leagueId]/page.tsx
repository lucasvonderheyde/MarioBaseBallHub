import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import {
  CommissionerPanel,
  type CommissionerTab,
} from "@/components/commissioner/CommissionerPanel";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { db } from "@/db";
import { leagues, seasons } from "@/db/schema";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import {
  getCommissionerMembers,
  getCommissionerOverview,
  getCommissionerSeasons,
} from "@/lib/league-commissioner";
import {
  getLeagueRole,
  isLeagueAdmin,
  leagueExists,
} from "@/lib/league-access";
import {
  pickDefaultSeasonId,
  sortSeasonsForDisplay,
} from "@/lib/league-season-sort";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ e?: string; m?: string; tab?: string }>;
};

function parseTab(value: string | undefined): CommissionerTab {
  if (value === "seasons") return "seasons";
  if (value === "members") return "members";
  if (value === "settings") return "settings";
  return "overview";
}

export default async function LeaguePage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { e, m, tab: tabParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!(await leagueExists(leagueId))) notFound();

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) notFound();

  const role = await getLeagueRole(leagueId, user);
  const isAdmin = isLeagueAdmin(role);

  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId))
    .orderBy(asc(seasons.createdAt));

  const sortedSeasons = sortSeasonsForDisplay(seasonRows);
  const activeSeasonId = pickDefaultSeasonId(sortedSeasons);

  if (!isAdmin) {
    if (activeSeasonId) {
      redirect(`/leagues/${leagueId}/seasons/${activeSeasonId}`);
    }

    return (
      <PageShell width="default">
        <PageHero
          title={league.name}
          variant="page"
          subtitle="No active season yet. Contact the commissioner for updates."
        />
        <p className="text-center text-sm text-zinc-500">
          <Link href="/leagues" className="text-amber-400 hover:underline">
            Back to all leagues
          </Link>
        </p>
      </PageShell>
    );
  }

  const activeTab = parseTab(tabParam);
  const [overview, commissionerSeasons, members] = await Promise.all([
    getCommissionerOverview(leagueId),
    getCommissionerSeasons(leagueId),
    getCommissionerMembers(leagueId),
  ]);

  return (
    <PageShell width="wide">
      <PageHero
        title={league.name}
        variant="page"
        subtitle="Commissioner Panel"
      />

      {e ? (
        <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "member" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Member added (or was already in the league).
        </p>
      ) : null}
      {m === "member-removed" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Manager removed from the league.
        </p>
      ) : null}
      {m === "renamed" ? (
        <p className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          League renamed.
        </p>
      ) : null}

      <CommissionerPanel
        leagueId={leagueId}
        leagueName={league.name}
        activeTab={activeTab}
        overview={overview}
        seasonRows={commissionerSeasons}
        members={members}
        currentUserId={user.id}
        isSiteAdmin={userIsSiteAdmin(user)}
      />
    </PageShell>
  );
}
