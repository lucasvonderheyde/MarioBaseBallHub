import Link from "next/link";
import type { TeamStandingRow } from "@/domain/standings/compute-standings";

type TeamRow = {
  team: { id: string; name: string };
  manager?: { username: string } | null;
};

type Props = {
  leagueId: string;
  seasonId: string;
  teams: TeamRow[];
  standings: TeamStandingRow[];
};

export function SeasonHubTeamGrid({ leagueId, seasonId, teams, standings }: Props) {
  const recordByTeam = new Map(
    standings.map((row) => [row.teamId, { wins: row.wins, losses: row.losses }]),
  );

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Teams</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map(({ team, manager }) => {
          const record = recordByTeam.get(team.id);
          return (
            <Link
              key={team.id}
              href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${team.id}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-600"
            >
              <p className="font-medium text-amber-400">{team.name}</p>
              {manager ? (
                <p className="mt-1 text-sm text-zinc-500">@{manager.username}</p>
              ) : (
                <p className="mt-1 text-sm text-zinc-600">Unclaimed</p>
              )}
              {record ? (
                <p className="mt-2 text-sm tabular-nums text-zinc-300">
                  {record.wins}–{record.losses}
                </p>
              ) : (
                <p className="mt-2 text-sm text-zinc-600">0–0</p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
