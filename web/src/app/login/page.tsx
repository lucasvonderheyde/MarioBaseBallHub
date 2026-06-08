import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSafeRedirectPath } from "@/lib/team-claims";
import { loginAction } from "@/server/actions";

export default async function LoginPage({
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
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-xl font-semibold">Log in</h1>
      {e ? (
        <p className="mt-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      <form action={loginAction} className="mt-6 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div>
          <label className="text-sm text-zinc-400">Username</label>
          <input
            name="username"
            required
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400">Password</label>
          <input
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="msb-btn-primary w-full py-2"
        >
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-500">
        No account?{" "}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="text-amber-400 hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
