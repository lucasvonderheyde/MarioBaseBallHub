import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, rosterInstances, teams, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole } from "@/lib/league-access";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { characterMugshotUrl, stadiumIconUrl } from "@/lib/asset-urls";
import { updateTeamAction } from "@/server/actions";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string; teamId: string }>;
  searchParams: Promise<{ e?: string }>;
};

export default async function TeamPage({ params, searchParams }: Props) {
  const { leagueId, seasonId, teamId } = await params;
  const { e } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user.id);
  if (!role) notFound();

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team || team.seasonId !== seasonId) notFound();

  const [manager] = team.managerUserId
    ? await db.select().from(users).where(eq(users.id, team.managerUserId)).limit(1)
    : [null];

  const roster = await db
    .select({ instance: rosterInstances, character: characters })
    .from(rosterInstances)
    .innerJoin(characters, eq(rosterInstances.characterId, characters.id))
    .where(
      and(eq(rosterInstances.seasonId, seasonId), eq(rosterInstances.teamId, teamId)),
    );

  const stadiumRow = team.homeStadiumGameId
    ? dash.stadiums.find((s) => s.gameStadiumId === team.homeStadiumGameId)
    : null;
  const stadiumImg = stadiumRow?.iconFile
    ? stadiumIconUrl(stadiumRow.iconFile)
    : null;

  const isAdmin = role === "admin";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link
        href={`/leagues/${leagueId}/seasons/${seasonId}`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Season
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{team.name}</h1>
      {e ? (
        <p className="mt-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {manager ? (
        <p className="mt-1 text-zinc-400">
          Manager: <span className="text-zinc-200">{manager.username}</span>
          {manager.displayName ? (
            <span className="text-zinc-500"> ({manager.displayName})</span>
          ) : null}
        </p>
      ) : (
        <p className="mt-1 text-zinc-500">No manager assigned.</p>
      )}

      {team.homeStadiumGameId ? (
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Home stadium
          </h2>
          <div className="mt-2 flex items-center gap-3">
            {stadiumImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stadiumImg} alt="" width={48} height={48} className="rounded" />
            ) : null}
            <span className="text-lg">{team.homeStadiumGameId}</span>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Roster</h2>
        <ul className="mt-3 space-y-2">
          {roster.map(({ character, instance }) => (
            <li
              key={instance.id}
              className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/50 px-2 py-1 text-sm"
            >
              {character.mugshotFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={characterMugshotUrl(character.mugshotFile)}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded"
                />
              ) : null}
              <span>{character.displayName}</span>
              <span className="font-mono text-xs text-zinc-600">
                #{instance.copyIndex}
              </span>
            </li>
          ))}
        </ul>
        {roster.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No players assigned yet.</p>
        ) : null}
      </section>

      {isAdmin ? (
        <section className="mt-10 rounded-lg border border-amber-900/40 bg-amber-950/10 p-4">
          <h2 className="font-semibold text-amber-200">Edit team (admin)</h2>
          <form
            action={updateTeamAction.bind(null, teamId, seasonId, leagueId)}
            className="mt-3 space-y-3"
          >
            <div>
              <label className="text-xs text-zinc-500">Team name</label>
              <input
                name="name"
                defaultValue={team.name}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Manager username</label>
              <input
                name="managerUsername"
                defaultValue={manager?.username ?? ""}
                placeholder="empty = none"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Home stadium (game ID)</label>
              <input
                name="homeStadium"
                defaultValue={team.homeStadiumGameId ?? ""}
                placeholder="e.g. Bowser Castle"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-amber-500 px-3 py-1 text-sm font-medium text-zinc-950"
            >
              Save
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
