import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { passwordPolicyDescription } from "@/lib/password-policy";
import { resetPasswordAction } from "@/server/actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; token?: string }>;
}) {
  const { e, token } = await searchParams;

  if (!token) {
    return (
      <PageShell width="narrow" className="py-12">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-4 text-sm text-zinc-500">
          This reset link is invalid.{" "}
          <Link href="/forgot-password" className="text-amber-400 hover:underline">
            Request a new one
          </Link>
          .
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell width="narrow" className="py-12">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <p className="mt-2 text-sm text-zinc-500">{passwordPolicyDescription()}</p>

      {e ? (
        <p className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}

      <form action={resetPasswordAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="text-sm text-zinc-400">New password</label>
          <input
            name="newPassword"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400">Confirm new password</label>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </div>
        <button type="submit" className="msb-btn-primary w-full py-2">
          Update password
        </button>
      </form>
    </PageShell>
  );
}
