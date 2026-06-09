import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { logoutAction } from "@/server/actions";

export async function Nav() {
  const user = await getCurrentUser();
  return (
    <header className="border-b-2 border-msb-grass bg-zinc-950/90 shadow-[0_4px_24px_rgb(10_34_64/0.15)] backdrop-blur dark:shadow-[0_4px_24px_rgb(10_34_64/0.6)]">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={user ? "/leagues" : "/"}
          className="text-lg font-bold tracking-tight sm:text-xl"
        >
          <span className="text-msb-mario">Mario</span>{" "}
          <span className="text-msb-gold-bright">Baseball</span>{" "}
          <span className="text-zinc-200">Hub</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/leagues"
                className="text-zinc-300 hover:text-msb-gold-bright"
              >
                Leagues
              </Link>
              <Link
                href="/characters"
                className="text-zinc-300 hover:text-msb-gold-bright"
              >
                Characters
              </Link>
              <Link
                href="/h2h"
                className="text-zinc-300 hover:text-msb-gold-bright"
              >
                H2H
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
                className="hidden text-zinc-500 hover:text-msb-gold-bright sm:inline"
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
