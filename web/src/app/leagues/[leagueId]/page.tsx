import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leagues, seasons } from "@/db/schema";
import { LeaguePublicHub } from "@/components/LeaguePublicHub";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import {
  getLeagueRole,
  isLeagueAdmin,
  leagueExists,
} from "@/lib/league-access";
import {
  pickDefaultSeasonId,
  sortSeasonsForDisplay,
} from "@/lib/league-season-sort";
import {
  addMemberAction,
  createSeasonAction,
  renameLeagueAction,
} from "@/server/actions";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ e?: string; m?: string }>;
};

export default async function LeaguePage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { e, m } = await searchParams;
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
  const activeSeason = activeSeasonId
    ? sortedSeasons.find((s) => s.id === activeSeasonId) ?? null
    : null;

  if (!isAdmin) {
    return (
      <LeaguePublicHub
        leagueId={leagueId}
        leagueName={league.name}
        activeSeason={activeSeason}
      />
    );
  }

  return (
    <PageShell width="default">
      <h1 className="text-2xl font-bold">{league.name}</h1>
      {userIsSiteAdmin(user) ? (
        <p className="mt-1 text-sm text-amber-300/90">
          Site admin — full access to this league.
        </p>
      ) : (
        <p className="mt-1 text-sm text-amber-400/90">You are a league admin.</p>
      )}
      {e ? (
        <p className="mt-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "member" ? (
        <p className="mt-2 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Member added (or was already in the league).
        </p>
      ) : null}
      {m === "renamed" ? (
        <p className="mt-2 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          League renamed.
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Seasons</h2>
        <ul className="mt-3 space-y-2">
          {sortedSeasons.map((s) => (
            <li key={s.id}>
              <Link
                href={`/leagues/${leagueId}/seasons/${s.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:border-zinc-600"
              >
                <span className="font-medium">{s.name}</span>
                <span
                  className={`ml-2 text-sm capitalize ${
                    s.status === "active" ? "text-amber-400" : "text-zinc-500"
                  }`}
                >
                  {s.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="font-semibold">Rename league</h2>
        <form
          action={renameLeagueAction.bind(null, leagueId)}
          className="mt-3 flex flex-wrap gap-2"
        >
          <input
            name="name"
            required
            defaultValue={league.name}
            className="min-w-[200px] flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-md border border-zinc-600 px-4 py-2 text-zinc-200 hover:bg-zinc-800"
          >
            Save name
          </button>
        </form>
      </section>
      <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="font-semibold">New season</h2>
        <form
          action={createSeasonAction.bind(null, leagueId)}
          className="mt-3 flex flex-wrap gap-2"
        >
          <input
            name="name"
            required
            placeholder="Season name"
            className="min-w-[200px] flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          />
          <button type="submit" className="msb-btn-primary px-4 py-2">
            Create
          </button>
        </form>
      </section>
      <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="font-semibold">Team claims</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Send managers this link to register and claim their team.
        </p>
        <p className="mt-2 break-all font-mono text-xs text-amber-300/90">
          /leagues/{leagueId}/claim
        </p>
        <Link
          href={`/leagues/${leagueId}/claim`}
          className="mt-2 inline-block text-sm text-amber-400 hover:underline"
        >
          Preview claim page →
        </Link>
      </section>
      <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="font-semibold">Add manager</h2>
        <p className="mt-1 text-sm text-zinc-500">
          User must register first. Adds them as a manager (not an admin).
        </p>
        <form action={addMemberAction.bind(null, leagueId)} className="mt-3 flex flex-wrap gap-2">
          <input
            name="username"
            required
            placeholder="Username"
            className="min-w-[200px] flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded-md border border-zinc-600 px-4 py-2 text-zinc-200 hover:bg-zinc-800"
          >
            Add to league
          </button>
        </form>
      </section>
    </PageShell>
  );
}
