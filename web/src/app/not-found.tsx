import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center">
      <p className="msb-card-title">404</p>
      <h1 className="mt-2 text-2xl font-bold">Foul ball — page not found</h1>
      <p className="mt-3 text-sm text-zinc-400">
        This page doesn&apos;t exist, or it may have been traded away.
      </p>
      <Link href="/leagues" className="msb-btn-primary mt-6 inline-block px-4 py-2">
        Back to leagues
      </Link>
    </div>
  );
}
