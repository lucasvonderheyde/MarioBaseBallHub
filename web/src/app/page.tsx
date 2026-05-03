import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/leagues");
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Mario Baseball Hub</h1>
      <p className="mt-2 text-zinc-400">
        League schedule, rosters, stats uploads, and standings for your friend
        group.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/register"
          className="rounded-md bg-amber-500 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-400"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-zinc-600 px-4 py-2 text-zinc-200 hover:bg-zinc-900"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
