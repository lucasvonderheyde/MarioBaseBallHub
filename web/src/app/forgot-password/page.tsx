import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { requestPasswordResetAction } from "@/server/actions";
import { PASSWORD_RESET_SENT_MESSAGE } from "@/lib/password-reset-messages";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; m?: string }>;
}) {
  const { e, m } = await searchParams;

  return (
    <PageShell width="narrow" className="py-12">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Enter the email linked to your account. We&apos;ll send a reset link if
        one is on file.
      </p>
      <p className="mt-1 text-xs text-zinc-600">
        Link Google on your account page first if you haven&apos;t added an email
        yet.
      </p>

      {e ? (
        <p className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "sent" ? (
        <p className="mt-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {PASSWORD_RESET_SENT_MESSAGE}
        </p>
      ) : null}

      <form action={requestPasswordResetAction} className="mt-6 space-y-4">
        <div>
          <label className="text-sm text-zinc-400">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
          />
        </div>
        <button type="submit" className="msb-btn-primary w-full py-2">
          Send reset link
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-500">
        <Link href="/login" className="text-amber-400 hover:underline">
          Back to log in
        </Link>
      </p>
    </PageShell>
  );
}
