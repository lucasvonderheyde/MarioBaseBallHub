import Link from "next/link";
import type { TeamStandingRow } from "@/domain/standings/compute-standings";
import { Card } from "@/components/ui/Card";
import {
  MIN_TEAM_ROSTER_SIZE,
  rosterCountMeetsMinimum,
} from "@/lib/roster-rules";

type TeamRow = {
  team: { id: string; name: string };
  manager?: { username: string } | null;
};

type Props = {
  leagueId: string;
  seasonId: string;
  teams: TeamRow[];
  standings: TeamStandingRow[];
  rosterCounts: Map<string, number>;
};

export function SeasonHubTeamGrid({
  leagueId,
  seasonId,
  teams,
  standings,
  rosterCounts,
}: Props) {
  const recordByTeam = new Map(
    standings.map((row) => [row.teamId, { wins: row.wins, losses: row.losses }]),
  );

  return (
    <Card title="Teams">
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map(({ team, manager }) => {
          const record = recordByTeam.get(team.id);
          const rosterCount = rosterCounts.get(team.id) ?? 0;
          const rosterOk = rosterCountMeetsMinimum(rosterCount);
          return (
            <Link
              key={team.id}
              href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${team.id}`}
              className="rounded-lg border border-zinc-800/80 bg-zinc-950/30 p-4 transition hover:border-zinc-600/80"
            >
              <p className="font-medium text-msb-gold-bright">{team.name}</p>
              {manager ? (
                <p className="mt-1 text-sm text-zinc-500">@{manager.username}</p>
              ) : (
                <p className="mt-1 text-sm text-zinc-600">Unclaimed</p>
              )}
              <p
                className={`mt-2 text-sm tabular-nums ${
                  rosterOk ? "text-zinc-400" : "text-msb-gold-bright"
                }`}
              >
                Roster: {rosterCount}/{MIN_TEAM_ROSTER_SIZE}
                {!rosterOk ? " (below minimum)" : ""}
              </p>
              {record ? (
                <p className="mt-1 text-sm tabular-nums text-zinc-300">
                  {record.wins}–{record.losses}
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-600">0–0</p>
              )}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
