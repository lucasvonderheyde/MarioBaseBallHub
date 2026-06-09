import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { getDatabaseStatus } from "@/db/database-status";
import { leagueMembers, leagues, seasons, users } from "@/db/schema";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import {
  renameLeagueAction,
  renameSeasonAction,
} from "@/server/actions";
import {
  addLeagueMemberAsAdminAction,
  deleteLeagueAction,
  deleteSeasonAction,
  deleteUserAction,
  renameUserAction,
  restoreLeagueBackupAction,
  setSiteAdminAction,
} from "@/server/actions/site-admin-actions";
import { PageShell } from "@/components/PageShell";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; m?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!userIsSiteAdmin(user)) notFound();

  const { e, m } = await searchParams;

  const allLeagues = await db
    .select()
    .from(leagues)
    .orderBy(leagues.createdAt);

  const seasonCounts = new Map<string, number>();
  const memberCounts = new Map<string, number>();
  if (allLeagues.length) {
    const seasonRows = await db
      .select({ leagueId: seasons.leagueId, n: count() })
      .from(seasons)
      .groupBy(seasons.leagueId);
    for (const row of seasonRows) {
      seasonCounts.set(row.leagueId, row.n);
    }
    const memberRows = await db
      .select({ leagueId: leagueMembers.leagueId, n: count() })
      .from(leagueMembers)
      .groupBy(leagueMembers.leagueId);
    for (const row of memberRows) {
      memberCounts.set(row.leagueId, row.n);
    }
  }

  const allSeasons = await db
    .select({
      season: seasons,
      leagueName: leagues.name,
    })
    .from(seasons)
    .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
    .orderBy(seasons.createdAt);

  const allUsers = await db.select().from(users).orderBy(users.createdAt);
  const databaseStatus = getDatabaseStatus();

  function formatBytes(bytes: number | null): string {
    if (bytes == null) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <PageShell width="wide">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Site admin</h1>
        <Link href="/leagues" className="text-sm text-zinc-400 hover:text-white">
          Back to leagues
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        Master admin access for {user.username}. You can manage all leagues,
        seasons, and users across the site.
      </p>

      {e ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "league-deleted" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          League deleted.
        </p>
      ) : null}
      {m === "season-deleted" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Season deleted.
        </p>
      ) : null}
      {m === "user-deleted" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          User deleted.
        </p>
      ) : null}
      {m === "admin-granted" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Site admin access granted.
        </p>
      ) : null}
      {m === "admin-revoked" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Site admin access revoked.
        </p>
      ) : null}
      {m === "member-added" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          User added as league admin.
        </p>
      ) : null}
      {m === "user-renamed" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          User renamed.
        </p>
      ) : null}
      {m === "league-restored" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          League backup restored.
        </p>
      ) : null}

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-semibold">Database persistence</h2>
        <p className="mt-1 text-sm text-zinc-500">
          League data survives redeploys only when SQLite lives on a Railway volume.
        </p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Database file</dt>
            <dd className="font-mono text-xs text-zinc-300">{databaseStatus.path}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">File size</dt>
            <dd>{formatBytes(databaseStatus.sizeBytes)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">DATABASE_URL</dt>
            <dd className="font-mono text-xs text-zinc-300">
              {databaseStatus.configuredUrl ?? "(not set — using default ./data/league.db)"}
            </dd>
          </div>
        </dl>
        {databaseStatus.warnings.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm text-amber-200">
            {databaseStatus.warnings.map((warning) => (
              <li
                key={warning}
                className="rounded border border-amber-900/50 bg-amber-950/20 px-3 py-2"
              >
                {warning}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-emerald-300">
            Database path looks correct for Railway volume persistence.
          </p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Railway setup: Root Directory = <code className="text-zinc-400">web</code>. Volumes are
          not in Settings — open your project canvas, press{" "}
          <code className="text-zinc-400">Ctrl+K</code> (or right-click the canvas), search{" "}
          <strong className="font-medium text-zinc-400">Volume</strong>, pick your web service,
          mount at <code className="text-zinc-400">/app/data</code>, and set{" "}
          <code className="text-zinc-400">DATABASE_URL=file:/app/data/league.db</code>. Redeploy
          after saving.
        </p>
      </section>

      <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-semibold">League backups</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Download a JSON snapshot before major changes. Restore recreates a league from backup
          (teams, pool, rosters, schedule — not uploaded game stats files).
        </p>
        {allLeagues.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {allLeagues.map((league) => (
              <li key={league.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{league.name}</span>
                <a
                  href={`/api/admin/league-backup/${league.id}`}
                  className="text-amber-400 hover:underline"
                >
                  Download backup
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No leagues to back up yet.</p>
        )}
        <form action={restoreLeagueBackupAction} className="mt-4 space-y-2">
          <label className="text-xs text-zinc-500" htmlFor="backupJson">
            Restore from backup JSON
          </label>
          <textarea
            id="backupJson"
            name="backupJson"
            rows={6}
            placeholder="Paste backup JSON here…"
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs"
          />
          <button
            type="submit"
            className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Restore league
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">All leagues</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Deleting a league removes all seasons, teams, schedules, and stats.
        </p>
        <ul className="mt-4 space-y-3">
          {allLeagues.map((league) => (
            <li
              key={league.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/leagues/${league.id}`}
                    className="font-medium text-amber-400 hover:underline"
                  >
                    {league.name}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {seasonCounts.get(league.id) ?? 0} season(s) ·{" "}
                    {memberCounts.get(league.id) ?? 0} member(s) · slug{" "}
                    <span className="font-mono">{league.slug}</span>
                  </p>
                </div>
                <form action={deleteLeagueAction.bind(null, league.id)}>
                  <button
                    type="submit"
                    className="rounded border border-red-900/60 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                  >
                    Delete league
                  </button>
                </form>
              </div>
              <form
                action={renameLeagueAction.bind(null, league.id)}
                className="mt-3 flex flex-wrap items-center gap-2"
              >
                <input
                  name="name"
                  required
                  defaultValue={league.name}
                  className="min-w-[180px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
                <button
                  type="submit"
                  className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  Rename
                </button>
              </form>
              <form
                action={addLeagueMemberAsAdminAction.bind(null, league.id)}
                className="mt-2 flex flex-wrap items-center gap-2"
              >
                <input
                  name="username"
                  placeholder="Add user as league admin"
                  className="min-w-[180px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
                <button
                  type="submit"
                  className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  Add admin
                </button>
              </form>
            </li>
          ))}
          {allLeagues.length === 0 ? (
            <li className="text-sm text-zinc-500">No leagues yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">All seasons</h2>
        <ul className="mt-4 space-y-2">
          {allSeasons.map(({ season, leagueName }) => (
            <li
              key={season.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link
                    href={`/leagues/${season.leagueId}/seasons/${season.id}`}
                    className="text-amber-400 hover:underline"
                  >
                    {season.name}
                  </Link>
                  <span className="ml-2 text-zinc-500">in {leagueName}</span>
                  <span className="ml-2 capitalize text-zinc-600">{season.status}</span>
                </div>
                <form action={deleteSeasonAction.bind(null, season.id)}>
                  <button
                    type="submit"
                    className="rounded border border-red-900/60 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                  >
                    Delete season
                  </button>
                </form>
              </div>
              <form
                action={renameSeasonAction.bind(null, season.id, season.leagueId)}
                className="mt-2 flex flex-wrap items-center gap-2"
              >
                <input
                  name="name"
                  required
                  defaultValue={season.name}
                  className="min-w-[180px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
                <button
                  type="submit"
                  className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  Rename
                </button>
              </form>
            </li>
          ))}
          {allSeasons.length === 0 ? (
            <li className="text-sm text-zinc-500">No seasons yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">All users</h2>
        <ul className="mt-4 space-y-2">
          {allUsers.map((u) => (
            <li
              key={u.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{u.username}</span>
                  {u.displayName ? (
                    <span className="ml-2 text-zinc-500">{u.displayName}</span>
                  ) : null}
                  {u.isSiteAdmin ? (
                    <span className="ml-2 rounded-full border border-amber-700/60 px-2 py-0.5 text-xs text-amber-300">
                      site admin
                    </span>
                  ) : null}
                  {u.id === user.id ? (
                    <span className="ml-2 text-xs text-zinc-600">(you)</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                {u.isSiteAdmin ? (
                  u.id !== user.id ? (
                    <form action={setSiteAdminAction.bind(null, u.id)}>
                      <input type="hidden" name="makeAdmin" value="false" />
                      <button
                        type="submit"
                        className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        Revoke site admin
                      </button>
                    </form>
                  ) : null
                ) : (
                  <form action={setSiteAdminAction.bind(null, u.id)}>
                    <input type="hidden" name="makeAdmin" value="true" />
                    <button
                      type="submit"
                      className="rounded border border-amber-800/60 px-2 py-1 text-xs text-amber-300 hover:bg-amber-950/30"
                    >
                      Grant site admin
                    </button>
                  </form>
                )}
                {u.id !== user.id ? (
                  <form action={deleteUserAction.bind(null, u.id)}>
                    <button
                      type="submit"
                      className="rounded border border-red-900/60 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                    >
                      Delete user
                    </button>
                  </form>
                ) : null}
                </div>
              </div>
              <form
                action={renameUserAction.bind(null, u.id)}
                className="mt-2 flex flex-wrap items-center gap-2"
              >
                <input
                  name="username"
                  required
                  minLength={2}
                  defaultValue={u.username}
                  placeholder="Username"
                  className="min-w-[120px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
                <input
                  name="displayName"
                  defaultValue={u.displayName ?? ""}
                  placeholder="Display name"
                  className="min-w-[120px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                />
                <button
                  type="submit"
                  className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  Rename
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
