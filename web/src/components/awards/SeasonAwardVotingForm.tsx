"use client";

import { useState, useTransition } from "react";
import { AWARD_CATEGORIES } from "@/domain/awards/award-categories";
import { castAwardVoteAction } from "@/server/actions";

type TeamOption = { id: string; name: string };

type Props = {
  leagueId: string;
  seasonId: string;
  teams: TeamOption[];
  initialVotes: Record<string, string>;
};

export function SeasonAwardVotingForm({
  leagueId,
  seasonId,
  teams,
  initialVotes,
}: Props) {
  const [votes, setVotes] = useState(initialVotes);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedCategory, setSavedCategory] = useState<string | null>(null);

  function castVote(category: string, teamId: string) {
    setError(null);
    setSavedCategory(null);
    startTransition(async () => {
      const result = await castAwardVoteAction({
        leagueId,
        seasonId,
        category,
        teamId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setVotes((current) => ({ ...current, [category]: teamId }));
      setSavedCategory(category);
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {AWARD_CATEGORIES.map((category) => (
        <section
          key={category.id}
          className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"
        >
          <h3 className="font-semibold text-zinc-100">{category.label}</h3>
          <p className="mt-1 text-sm text-zinc-500">{category.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {teams.map((team) => {
              const selected = votes[category.id] === team.id;
              return (
                <button
                  key={team.id}
                  type="button"
                  disabled={pending}
                  onClick={() => castVote(category.id, team.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    selected
                      ? "border-amber-500 bg-amber-950/40 text-amber-200"
                      : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {team.name}
                </button>
              );
            })}
          </div>
          {savedCategory === category.id ? (
            <p className="mt-2 text-xs text-emerald-400">Vote saved.</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
