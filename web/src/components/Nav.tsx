import Link from "next/link";
import { LeagueSeasonSwitcher } from "@/components/LeagueSeasonSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { getUserLeagueSeasonNavOptions } from "@/lib/current-season-nav";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { logoutAction } from "@/server/actions";

export async function Nav() {
  const user = await getCurrentUser();
  const leagueSeasonOptions = user
    ? await getUserLeagueSeasonNavOptions(user.id)
    : [];
  const unreadCount = user ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <header className="border-b-2 border-msb-grass bg-zinc-950/90 shadow-[0_4px_24px_rgb(10_34_64/0.15)] backdrop-blur dark:shadow-[0_4px_24px_rgb(10_34_64/0.6)]">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-6 lg:px-8">
        <Link
          href={user ? "/leagues" : "/"}
          className="justify-self-start text-lg font-bold tracking-tight sm:text-xl"
        >
          <span className="text-msb-mario">Mario</span>{" "}
          <span className="text-msb-gold-bright">Baseball</span>{" "}
          <span className="text-zinc-200">Hub</span>
        </Link>

        {user && leagueSeasonOptions.length > 0 ? (
          <LeagueSeasonSwitcher options={leagueSeasonOptions} />
        ) : (
          <div className="hidden sm:block" aria-hidden />
        )}

        <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm sm:justify-self-end">
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
              <Link
                href="/tier-list"
                className="text-zinc-300 hover:text-msb-gold-bright"
              >
                Tier list
              </Link>
              <Link
                href="/users"
                className="text-zinc-300 hover:text-msb-gold-bright"
              >
                Users
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
                href="/account/notifications"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                className="relative text-zinc-300 hover:text-msb-gold-bright"
              >
                <span aria-hidden>🔔</span>
                {unreadCount > 0 ? (
                  <span className="absolute -right-2 -top-1.5 rounded-full bg-msb-mario px-1.5 text-[10px] font-bold leading-4 text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>
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
              <Link
                href="/tier-list"
                className="text-zinc-300 hover:text-msb-gold-bright"
              >
                Tier list
              </Link>
              <Link
                href="/users"
                className="text-zinc-300 hover:text-msb-gold-bright"
              >
                Users
              </Link>
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
