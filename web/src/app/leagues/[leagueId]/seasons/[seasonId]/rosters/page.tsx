import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, rosterInstances } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { characterMugshotUrl } from "@/lib/asset-urls";
import { assignRosterFormAction } from "@/server/actions";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string }>;
  searchParams: Promise<{ e?: string }>;
};

export default async function RostersPage({ params, searchParams }: Props) {
  const { leagueId, seasonId } = await params;
  const { e } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (role !== "admin") notFound();

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const instances = await db
    .select({
      instance: rosterInstances,
      character: characters,
    })
    .from(rosterInstances)
    .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
    .where(eq(rosterInstances.seasonId, seasonId))
    .orderBy(asc(characters.displayName), asc(rosterInstances.copyIndex));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/leagues/${leagueId}/seasons/${seasonId}`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Back to season
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Roster assignment</h1>
      {e ? (
        <p className="mt-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-zinc-500">
        Each row is one league copy of a character. Pick a team or leave
        unassigned.
      </p>
      <ul className="mt-6 space-y-3">
        {instances.map(({ instance, character }) => (
          <li
            key={instance.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
          >
            {character.mugshotFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={characterMugshotUrl(character.mugshotFile)}
                alt=""
                width={36}
                height={36}
                className="rounded"
              />
            ) : null}
            <div className="min-w-[140px] flex-1 text-sm">
              <div className="font-medium">{character.displayName}</div>
              <div className="font-mono text-xs text-zinc-500">
                #{instance.copyIndex} · {character.gameCharId}
              </div>
            </div>
            <form action={assignRosterFormAction} className="flex items-center gap-2">
              <input type="hidden" name="instanceId" value={instance.id} />
              <input type="hidden" name="seasonId" value={seasonId} />
              <input type="hidden" name="leagueId" value={leagueId} />
              <select
                name="teamId"
                defaultValue={instance.teamId ?? ""}
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              >
                <option value="">Unassigned</option>
                {dash.teams.map(({ team }) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="msb-btn-primary px-2 py-1 text-xs"
              >
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
