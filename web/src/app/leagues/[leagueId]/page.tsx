import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leagues, leagueMembers, seasons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { createSeasonAction, addMemberAction } from "@/server/actions";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ e?: string; m?: string }>;
};

export default async function LeaguePage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { e, m } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) notFound();

  const role = await getLeagueRole(leagueId, user.id);
  if (!role) notFound();

  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId))
    .orderBy(asc(seasons.createdAt));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <Link href="/leagues" className="text-sm text-zinc-400 hover:text-white">
          All leagues
        </Link>
      </div>
      {role === "admin" ? (
        <p className="mt-1 text-sm text-amber-400/90">You are a league admin.</p>
      ) : null}
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

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Seasons</h2>
        <ul className="mt-3 space-y-2">
          {seasonRows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/leagues/${leagueId}/seasons/${s.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:border-zinc-600"
              >
                <span className="font-medium">{s.name}</span>
                <span className="ml-2 text-sm capitalize text-zinc-500">
                  {s.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {role === "admin" ? (
        <>
          <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
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
              <button
                type="submit"
                className="rounded-md bg-amber-500 px-4 py-2 font-medium text-zinc-950"
              >
                Create
              </button>
            </form>
          </section>
          <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <h2 className="font-semibold">Add manager</h2>
            <p className="mt-1 text-sm text-zinc-500">
              User must register first. Enter their exact username.
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
        </>
      ) : null}
    </div>
  );
}
