import { PageShell } from "@/components/PageShell";

type Props = {
  width?: "narrow" | "default" | "wide";
};

/** Route-level loading skeleton: hero placeholder above a panel grid. */
export function PageLoading({ width = "default" }: Props) {
  return (
    <PageShell width={width}>
      <div role="status" aria-label="Loading page" className="animate-pulse">
        <div className="h-3 w-28 rounded bg-zinc-800/60" />
        <div className="mt-3 h-8 w-72 max-w-full rounded bg-zinc-800/60" />
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="msb-panel h-40" />
          ))}
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    </PageShell>
  );
}
