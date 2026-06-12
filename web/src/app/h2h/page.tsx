import { HeadToHeadComparisonView } from "@/components/HeadToHeadComparisonView";
import { HeadToHeadSelector } from "@/components/HeadToHeadSelector";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import {
  getHeadToHeadComparison,
  getH2hManagerOptions,
  getH2hSeasonOptions,
  type H2hSourceFilter,
} from "@/lib/head-to-head";

type Props = {
  searchParams: Promise<{ a?: string; b?: string; season?: string; source?: string }>;
};

function parseSource(value: string | undefined): H2hSourceFilter {
  if (value === "league" || value === "friendly") return value;
  return "all";
}

export default async function HeadToHeadPage({ searchParams }: Props) {
  const { a, b, season, source: sourceParam } = await searchParams;
  const source = parseSource(sourceParam);
  const [managers, seasons] = await Promise.all([
    getH2hManagerOptions(),
    getH2hSeasonOptions(),
  ]);

  const comparison =
    a && b
      ? await getHeadToHeadComparison({
          managerAId: a,
          managerBId: b,
          seasonId: season || undefined,
          source: season ? "all" : source,
        })
      : null;

  return (
    <PageShell width="default">
      <PageHero
        title="Head-to-head"
        subtitle="Compare any two managers by season or across their full history, including friendlies."
      />

      <section className="msb-panel p-4 sm:p-5">
        <HeadToHeadSelector
          managers={managers}
          seasons={seasons}
          managerAId={a ?? ""}
          managerBId={b ?? ""}
          seasonId={season ?? ""}
          source={season ? "all" : source}
        />
      </section>

      {comparison ? (
        <HeadToHeadComparisonView comparison={comparison} />
      ) : (
        <p className="mt-6 text-sm text-zinc-500">
          Pick two managers above to see their record against each other.
        </p>
      )}
    </PageShell>
  );
}
