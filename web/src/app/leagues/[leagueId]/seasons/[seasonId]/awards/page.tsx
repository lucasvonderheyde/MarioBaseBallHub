import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { SeasonAwardVotingForm } from "@/components/awards/SeasonAwardVotingForm";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { AWARD_CATEGORIES } from "@/domain/awards/award-categories";
import { db } from "@/db";
import { seasons, teams } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import {
  getAwardVoteResults,
  getUserAwardVotes,
} from "@/server/actions/award-voting-actions";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string }>;
};

export default async function SeasonAwardsPage({ params }: Props) {
  const { leagueId, seasonId } = await params;
  const user = await getCurrentUser();

  const role = await getLeagueRole(leagueId, user);

  const [season] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.id, seasonId), eq(seasons.leagueId, leagueId)))
    .limit(1);
  if (!season) notFound();

  if (!season.awardVotingOpen) {
    return (
      <PageShell width="narrow">
        <PageHero title="Season awards" subtitle="Voting is not open yet." />
        <p className="mt-4 text-sm text-zinc-500">
          The commissioner opens award voting after the playoffs wrap up.
        </p>
        <Link
          href={`/leagues/${leagueId}/seasons/${seasonId}`}
          className="msb-link mt-4 inline-block text-sm"
        >
          ← Season hub
        </Link>
      </PageShell>
    );
  }

  const teamRows = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.seasonId, seasonId));

  const [userVotes, results] = await Promise.all([
    user
      ? getUserAwardVotes(user.id, seasonId)
      : Promise.resolve(new Map<string, string>()),
    getAwardVoteResults(seasonId),
  ]);

  const resultsByCategory = new Map<string, typeof results>();
  for (const category of AWARD_CATEGORIES) {
    resultsByCategory.set(
      category.id,
      results
        .filter((row) => row.category === category.id)
        .sort((a, b) => b.votes - a.votes),
    );
  }

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={season.name}
        title="Season awards"
        subtitle="One vote per category. Pick the team that best fits each award."
      >
        <Link
          href={`/leagues/${leagueId}/seasons/${seasonId}`}
          className="msb-link text-sm"
        >
          ← Season hub
        </Link>
      </PageHero>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="msb-panel p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Cast your votes</h2>
          {user ? (
            <SeasonAwardVotingForm
              leagueId={leagueId}
              seasonId={seasonId}
              teams={teamRows}
              initialVotes={Object.fromEntries(userVotes)}
            />
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              <Link href="/login" className="text-amber-400 hover:underline">
                Log in
              </Link>{" "}
              to vote on season awards.
            </p>
          )}
        </section>

        <section className="msb-panel p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Live results</h2>
          <div className="mt-4 space-y-5">
            {AWARD_CATEGORIES.map((category) => {
              const rows = resultsByCategory.get(category.id) ?? [];
              return (
                <div key={category.id}>
                  <h3 className="text-sm font-semibold text-zinc-300">
                    {category.label}
                  </h3>
                  {rows.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                      {rows.map((row) => (
                        <li key={row.teamId} className="flex justify-between gap-2">
                          <span>{row.teamName}</span>
                          <span className="tabular-nums">{row.votes}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-600">No votes yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
