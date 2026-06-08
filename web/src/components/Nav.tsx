import Link from "next/link";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { logoutAction } from "@/server/actions";

export async function Nav() {
  const user = await getCurrentUser();
  return (
    <header className="border-b-2 border-msb-grass bg-zinc-950/90 shadow-[0_4px_24px_rgb(10_34_64_/_0.6)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={user ? "/leagues" : "/"}
          className="font-semibold tracking-tight"
        >
          <span className="text-msb-mario">Mario</span>{" "}
          <span className="text-msb-gold-bright">Baseball</span>{" "}
          <span className="text-zinc-200">Hub</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link
                href="/leagues"
                className="text-zinc-300 hover:text-msb-gold-bright"
              >
                Leagues
              </Link>
              {userIsSiteAdmin(user) ? (
                <Link
                  href="/admin"
                  className="text-amber-300 hover:text-msb-gold-bright"
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href="/account"
                className="text-zinc-500 hover:text-msb-gold-bright"
              >
                {user.displayName ?? user.username}
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-zinc-700 px-2 py-1 text-zinc-300 hover:border-msb-sky hover:bg-zinc-800"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-zinc-300 hover:text-msb-gold-bright"
              >
                Log in
              </Link>
              <Link href="/register" className="msb-btn-primary px-3 py-1">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
