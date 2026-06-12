import Link from "next/link";
import { CharacterIcon } from "@/components/CharacterIcon";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { TierListVotingForm } from "@/components/tier-list/TierListVotingForm";
import { CHARACTER_CATALOG } from "@/data/character-catalog";
import {
  aggregateTierBallots,
  TIER_OPTIONS,
  type CharacterTier,
} from "@/domain/tier-list/tiers";
import { getCurrentUser } from "@/lib/auth";
import {
  getAllTierBallots,
  getUserTierBallot,
} from "@/server/actions/tier-list-actions";

function tierBarClass(tier: CharacterTier): string {
  if (tier === "S") return "bg-amber-500";
  if (tier === "A") return "bg-emerald-500";
  if (tier === "B") return "bg-sky-500";
  if (tier === "C") return "bg-violet-500";
  if (tier === "D") return "bg-orange-600";
  return "bg-red-700";
}

export default async function TierListPage() {
  const user = await getCurrentUser();

  const charIds = CHARACTER_CATALOG.map((row) => row.gameCharId);
  const [userTiers, allBallots] = await Promise.all([
    user ? getUserTierBallot(user.id) : Promise.resolve({}),
    getAllTierBallots(),
  ]);

  const aggregates = aggregateTierBallots(allBallots, charIds)
    .filter((row) => row.totalVotes > 0)
    .sort((a, b) => b.totalVotes - a.totalVotes);

  const catalogById = new Map(
    CHARACTER_CATALOG.map((row) => [row.gameCharId, row]),
  );

  return (
    <PageShell width="wide">
      <PageHero
        title="Community tier list"
        subtitle="Rate every Mario Superstar Baseball character. One ballot per account — results aggregate across all voters."
      />

      <section className="mt-8 msb-panel p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Community results</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {allBallots.length} ballot{allBallots.length === 1 ? "" : "s"} submitted.
        </p>
        {aggregates.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {aggregates.slice(0, 20).map((row) => {
              const character = catalogById.get(row.gameCharId);
              if (!character) return null;
              return (
                <li
                  key={row.gameCharId}
                  className="flex flex-wrap items-center gap-3 text-sm"
                >
                  <CharacterIcon charId={row.gameCharId} size={28} />
                  <Link
                    href={`/characters/${encodeURIComponent(row.gameCharId)}`}
                    className="w-40 shrink-0 text-amber-400 hover:underline"
                  >
                    {character.displayName}
                  </Link>
                  {row.consensusTier ? (
                    <span className="rounded bg-zinc-800 px-2 py-0.5 font-semibold tabular-nums">
                      {row.consensusTier}
                    </span>
                  ) : null}
                  <div className="flex flex-1 gap-0.5">
                    {TIER_OPTIONS.map((tier) => {
                      const pct =
                        row.totalVotes > 0
                          ? (row.counts[tier] / row.totalVotes) * 100
                          : 0;
                      if (pct < 8) return null;
                      return (
                        <div
                          key={tier}
                          className={`h-2 rounded-sm ${tierBarClass(tier)}`}
                          style={{ width: `${pct}%` }}
                          title={`${tier}: ${row.counts[tier]}`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs text-zinc-500">{row.totalVotes} votes</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No ballots yet — be the first.</p>
        )}
      </section>

      {user ? (
        <section className="mt-8 msb-panel p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Your ballot</h2>
          <TierListVotingForm
            characters={CHARACTER_CATALOG.map((row) => ({
              gameCharId: row.gameCharId,
              displayName: row.displayName,
            }))}
            initialTiers={userTiers}
          />
        </section>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">
          <Link href="/login" className="text-amber-400 hover:underline">
            Log in
          </Link>{" "}
          to submit your tier list.
        </p>
      )}
    </PageShell>
  );
}
