import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { updateProfileAction } from "@/server/actions";
import { PageShell } from "@/components/PageShell";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; m?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { e, m } = await searchParams;

  return (
    <PageShell width="narrow">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Account</h1>
        <Link href="/leagues" className="text-sm text-zinc-400 hover:text-white">
          Leagues
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        Update your login username and display name.
      </p>

      {e ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "updated" ? (
        <p className="mt-3 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Profile updated.
        </p>
      ) : null}

      {!userIsSiteAdmin(user) ? (
        <p className="mt-4 text-sm text-zinc-500">
          Need site admin?{" "}
          <Link href="/setup-admin" className="text-amber-400 hover:underline">
            Claim admin access
          </Link>
        </p>
      ) : null}

      <form action={updateProfileAction} className="mt-6 space-y-4">
        <div>
          <label className="text-sm text-zinc-400">Username</label>
          <input
            name="username"
            required
            minLength={2}
            defaultValue={user.username}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
          <p className="mt-1 text-xs text-zinc-600">
            Used to log in and to add you to leagues.
          </p>
        </div>
        <div>
          <label className="text-sm text-zinc-400">Display name</label>
          <input
            name="displayName"
            defaultValue={user.displayName ?? ""}
            placeholder="Optional"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </div>
        <button type="submit" className="msb-btn-primary w-full py-2">
          Save changes
        </button>
      </form>
    </PageShell>
  );
}
