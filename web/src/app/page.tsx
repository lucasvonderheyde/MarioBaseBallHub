import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageShell } from "@/components/PageShell";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/leagues");
  return (
    <PageShell width="narrow" className="py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        <span className="text-msb-mario">Mario</span>{" "}
        <span className="text-msb-gold-bright">Baseball</span> Hub
      </h1>
      <p className="mt-3 text-zinc-400">
        League schedule, rosters, stats uploads, and standings for your friend
        group.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/register" className="msb-btn-primary px-4 py-2">
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-msb-sky/50 px-4 py-2 text-zinc-200 hover:border-msb-sky hover:bg-zinc-900/80"
        >
          Log in
        </Link>
      </div>
    </PageShell>
  );
}
