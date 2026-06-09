import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSafeRedirectPath } from "@/lib/team-claims";
import { registerAction } from "@/server/actions";
import { PageShell } from "@/components/PageShell";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; next?: string }>;
}) {
  const user = await getCurrentUser();
  const { e, next } = await searchParams;
  if (user) {
    redirect(isSafeRedirectPath(next) ? next : "/leagues");
  }
  return (
    <PageShell width="narrow" className="py-12">
      <h1 className="text-xl font-semibold">Register</h1>
      {e ? (
        <p className="mt-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-zinc-500">
        Use the same username you use in netplay if you want upload name checks
        to line up.
      </p>
      <form action={registerAction} className="mt-6 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div>
          <label className="text-sm text-zinc-400">Username</label>
          <input
            name="username"
            required
            minLength={2}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400">Netplay / display name</label>
          <input
            name="displayName"
            placeholder="e.g. Zomsoth"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="msb-btn-primary w-full py-2"
        >
          Create account
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-500">
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-amber-400 hover:underline"
        >
          Back to log in
        </Link>
      </p>
    </PageShell>
  );
}
