import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leagues } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getClaimableTeamsForLeague } from "@/lib/team-claims";
import { claimTeamAction } from "@/server/actions";
import { PageShell } from "@/components/PageShell";
import { SectionHeading } from "@/components/SectionHeading";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ e?: string }>;
};

export default async function ClaimTeamsPage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { e } = await searchParams;
  const user = await getCurrentUser();

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) notFound();

  const claimPath = `/leagues/${leagueId}/claim`;
  const loginHref = `/login?next=${encodeURIComponent(claimPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(claimPath)}`;

  if (!user) {
    return (
      <PageShell width="narrow" className="py-12">
        <h1 className="text-2xl font-bold">Claim your team</h1>
        <p className="mt-2 text-zinc-400">
          Join <span className="text-zinc-200">{league.name}</span> by logging in
          and claiming an open team.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={registerHref} className="msb-btn-primary px-4 py-2">
            Register
          </Link>
          <Link
            href={loginHref}
            className="rounded-md border border-msb-sky/50 px-4 py-2 text-zinc-200 hover:border-msb-sky"
          >
            Log in
          </Link>
        </div>
      </PageShell>
    );
  }

  const claimable = await getClaimableTeamsForLeague(leagueId, user);
  const bySeason = new Map<string, typeof claimable>();
  for (const row of claimable) {
    const key = row.season.id;
    if (!bySeason.has(key)) bySeason.set(key, []);
    bySeason.get(key)!.push(row);
  }

  return (
    <PageShell width="narrow">
      <h1 className="text-2xl font-bold">Claim your team</h1>
      <p className="mt-1 text-zinc-400">{league.name}</p>
      {e ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}

      {claimable.length === 0 ? (
        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
          <p>No teams are available for you to claim right now.</p>
          <p className="mt-2">
            Teams may already be taken, reserved for another username, or you may
            already manage a team this season.
          </p>
          <Link href="/leagues" className="mt-4 inline-block text-amber-400 hover:underline">
            Go to your leagues
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {[...bySeason.entries()].map(([seasonId, rows]) => (
            <section key={seasonId}>
              <SectionHeading>{rows[0]!.season.name}</SectionHeading>
              <ul className="mt-3 space-y-3">
                {rows.map(({ team }) => (
                  <li
                    key={team.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{team.name}</p>
                      {team.claimUsername ? (
                        <p className="text-xs text-zinc-500">
                          Reserved for{" "}
                          <span className="font-mono text-zinc-400">
                            {team.claimUsername}
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-500">Open claim</p>
                      )}
                      {team.homeStadiumGameId ? (
                        <p className="text-xs text-zinc-600">
                          Home: {team.homeStadiumGameId}
                        </p>
                      ) : null}
                    </div>
                    <form
                      action={claimTeamAction.bind(
                        null,
                        team.id,
                        leagueId,
                        seasonId,
                      )}
                    >
                      <button
                        type="submit"
                        className="msb-btn-primary px-3 py-1.5 text-sm"
                      >
                        Claim team
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
