import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { leagues, leagueMembers, seasons } from "@/db/schema";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { createLeagueAction } from "@/server/actions";
import { PageShell } from "@/components/PageShell";
import { getLeaguesWithClaimableTeams } from "@/lib/team-claims";

export default async function LeaguesPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; m?: string }>;
}) {
  const user = await getCurrentUser();
  const { e, m } = await searchParams;

  const allLeagues = await db.select().from(leagues).orderBy(asc(leagues.name));

  const memberLeagueIds = user
    ? new Set(
        (
          await db
            .select({ leagueId: leagueMembers.leagueId })
            .from(leagueMembers)
            .where(eq(leagueMembers.userId, user.id))
        ).map((row) => row.leagueId),
      )
    : new Set<string>();

  const seasonCounts = new Map<string, number>();
  const counts = await db
    .select({
      leagueId: seasons.leagueId,
      n: count(),
    })
    .from(seasons)
    .groupBy(seasons.leagueId);
  for (const row of counts) {
    seasonCounts.set(row.leagueId, row.n);
  }

  const claimableLeagues = user ? await getLeaguesWithClaimableTeams(user) : [];

  return (
    <PageShell width="default">
      <h1 className="text-2xl font-bold">Leagues</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Browse every league on the hub. Log in to create a league or claim a team.
      </p>
      {user && userIsSiteAdmin(user) ? (
        <p className="mt-2 text-sm text-amber-300/90">
          Site admin —{" "}
          <Link href="/admin" className="text-amber-400 hover:underline">
            manage all leagues and users
          </Link>
          .
        </p>
      ) : null}
      {e ? (
        <p className="mt-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "site-admin-granted" ? (
        <p className="mt-2 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Site admin access granted. You can create leagues and manage seasons.
        </p>
      ) : null}
      {claimableLeagues.length > 0 ? (
        <section className="mt-6 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
          <h2 className="font-semibold text-amber-200">Teams waiting for you</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {claimableLeagues.map(({ league, count: teamCount }) => (
              <li key={league.id}>
                <Link
                  href={`/leagues/${league.id}/claim`}
                  className="text-amber-400 hover:underline"
                >
                  {league.name}
                </Link>
                <span className="text-zinc-500"> — {teamCount} team(s) to claim</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ul className="mt-6 space-y-2">
        {allLeagues.map((league) => (
          <li key={league.id}>
            <Link
              href={`/leagues/${league.id}`}
              className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:border-zinc-600"
            >
              <span className="font-medium">{league.name}</span>
              <span className="ml-2 text-sm text-zinc-500">
                {seasonCounts.get(league.id) ?? 0} season(s)
              </span>
              {user && memberLeagueIds.has(league.id) ? (
                <span className="ml-2 text-xs text-amber-400/80">Member</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {allLeagues.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No leagues yet.</p>
      ) : null}
      {user ? (
        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
          <h2 className="font-semibold">Create league</h2>
          <p className="mt-1 text-sm text-zinc-500">
            You become the commissioner when you create a league.
          </p>
          <form action={createLeagueAction} className="mt-3 flex flex-wrap gap-2">
            <input
              name="name"
              required
              placeholder="League name"
              className="min-w-[200px] flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
            <button type="submit" className="msb-btn-primary px-4 py-2">
              Create
            </button>
          </form>
        </section>
      ) : (
        <p className="mt-10 text-sm text-zinc-500">
          <Link href="/login" className="text-amber-400 hover:underline">
            Log in
          </Link>{" "}
          to create a league.
        </p>
      )}
    </PageShell>
  );
}
