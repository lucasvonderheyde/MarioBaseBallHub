import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/server/actions";

export async function Nav() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href={user ? "/leagues" : "/"} className="font-semibold tracking-tight">
          Mario Baseball Hub
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/leagues" className="text-zinc-300 hover:text-white">
                Leagues
              </Link>
              <span className="text-zinc-500">{user.username}</span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-300 hover:text-white">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-amber-500 px-3 py-1 font-medium text-zinc-950 hover:bg-amber-400"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
