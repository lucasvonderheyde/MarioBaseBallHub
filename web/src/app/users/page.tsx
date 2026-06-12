import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ManagerAvatar } from "@/components/ManagerAvatar";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";

export default async function UsersPage() {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      profilePictureUrl: users.profilePictureUrl,
    })
    .from(users)
    .orderBy(asc(users.username));

  return (
    <PageShell width="default">
      <PageHero
        title="Users"
        subtitle="Lifetime stats for every manager on the hub."
      />

      <ul className="mt-8 space-y-2">
        {rows.map((user) => (
          <li key={user.id}>
            <Link
              href={`/users/${encodeURIComponent(user.username)}`}
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:border-zinc-600"
            >
              <ManagerAvatar user={user} size={36} />
              <span className="font-medium">{user.displayName ?? user.username}</span>
              {user.displayName ? (
                <span className="text-sm text-zinc-500">@{user.username}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No users registered yet.</p>
      ) : null}
    </PageShell>
  );
}
