import Link from "next/link";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { leagues, leagueMembers, seasons } from "@/db/schema";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { createLeagueAction } from "@/server/actions";
import { getLeaguesWithClaimableTeams } from "@/lib/team-claims";

export default async function LeaguesPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { e } = await searchParams;

  const memberRows = await db
    .select({ league: leagues })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, user.id));

  const seasonCounts = new Map<string, number>();
  if (memberRows.length) {
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
  }

  const claimableLeagues = await getLeaguesWithClaimableTeams(user);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Your leagues</h1>
      {userIsSiteAdmin(user) ? (
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
      {claimableLeagues.length > 0 ? (
        <section className="mt-6 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
          <h2 className="font-semibold text-amber-200">Teams waiting for you</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {claimableLeagues.map(({ league, count }) => (
              <li key={league.id}>
                <Link
                  href={`/leagues/${league.id}/claim`}
                  className="text-amber-400 hover:underline"
                >
                  {league.name}
                </Link>
                <span className="text-zinc-500"> — {count} team(s) to claim</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ul className="mt-6 space-y-2">
        {memberRows.map(({ league }) => (
          <li key={league.id}>
            <Link
              href={`/leagues/${league.id}`}
              className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:border-zinc-600"
            >
              <span className="font-medium">{league.name}</span>
              <span className="ml-2 text-sm text-zinc-500">
                {seasonCounts.get(league.id) ?? 0} season(s)
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="font-semibold">Create league</h2>
        <form action={createLeagueAction} className="mt-3 flex flex-wrap gap-2">
          <input
            name="name"
            required
            placeholder="League name"
            className="min-w-[200px] flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          />
          <button
            type="submit"
            className="msb-btn-primary px-4 py-2"
          >
            Create
          </button>
        </form>
      </section>
    </div>
  );
}
