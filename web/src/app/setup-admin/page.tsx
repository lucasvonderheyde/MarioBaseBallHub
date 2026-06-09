import Link from "next/link";
import { redirect } from "next/navigation";
import { adminSetupSecretConfigured } from "@/db/grant-site-admin";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { claimSiteAdminAction } from "@/server/actions/setup-admin-actions";
import { PageShell } from "@/components/PageShell";

export default async function SetupAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/setup-admin");

  const { e } = await searchParams;
  const secretConfigured = adminSetupSecretConfigured();

  if (userIsSiteAdmin(user)) {
    return (
      <PageShell width="default">
        <h1 className="text-2xl font-bold">Site admin</h1>
        <p className="mt-2 text-sm text-emerald-300">
          You already have site admin access as{" "}
          <span className="font-medium text-zinc-200">{user.username}</span>.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-amber-400 hover:underline">
          Open admin panel →
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell width="default">
      <h1 className="text-2xl font-bold">Claim site admin</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Logged in as{" "}
        <span className="font-medium text-zinc-200">{user.username}</span>.
        Enter the setup secret from your Railway environment variables to grant
        admin access to this account.
      </p>

      {e ? (
        <p className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}

      {!secretConfigured ? (
        <p className="mt-4 rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
          This server has no <code className="text-amber-100">ADMIN_SETUP_SECRET</code>{" "}
          configured. Add one in Railway → Variables, redeploy, then return here.
        </p>
      ) : (
        <form action={claimSiteAdminAction} className="mt-6 max-w-md space-y-4">
          <div>
            <label htmlFor="secret" className="text-xs text-zinc-500">
              Setup secret
            </label>
            <input
              id="secret"
              name="secret"
              type="password"
              required
              autoComplete="off"
              placeholder="Paste ADMIN_SETUP_SECRET from Railway"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="msb-btn-primary px-4 py-2 text-sm">
            Grant admin to my account
          </button>
        </form>
      )}

      <p className="mt-8 text-xs text-zinc-600">
        <Link href="/leagues" className="hover:text-zinc-400">
          ← Back to leagues
        </Link>
      </p>
    </PageShell>
  );
}
