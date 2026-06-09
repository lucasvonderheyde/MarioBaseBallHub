import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { TeamStandingRow } from "@/domain/standings/compute-standings";

type Props = {
  leagueId: string;
  seasonId: string;
  standings: TeamStandingRow[];
  userTeamId: string | null;
};

export function SeasonHubStandings({
  leagueId,
  seasonId,
  standings,
  userTeamId,
}: Props) {
  return (
    <Card title="Standings">
      {standings.length > 0 ? (
        <div className="msb-table-wrap -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-left text-xs text-zinc-500">
                <th className="pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-2 font-medium">Team</th>
                <th className="pb-2 pr-2 text-right font-medium tabular-nums">W</th>
                <th className="pb-2 pr-2 text-right font-medium tabular-nums">L</th>
                <th className="pb-2 pr-2 text-right font-medium tabular-nums">RF</th>
                <th className="pb-2 text-right font-medium tabular-nums">RA</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => {
                const isUserTeam = userTeamId != null && row.teamId === userTeamId;
                return (
                  <tr
                    key={row.teamId}
                    className="msb-row-divider border-zinc-800/50"
                  >
                    <td className="py-2.5 pr-2 tabular-nums text-zinc-500">
                      {index + 1}
                    </td>
                    <td className="py-2.5 pr-2">
                      <Link
                        href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${row.teamId}`}
                        className={
                          isUserTeam
                            ? "font-medium text-msb-gold-bright hover:underline"
                            : "text-zinc-200 hover:text-msb-gold-bright hover:underline"
                        }
                      >
                        {isUserTeam ? `★ ${row.name}` : row.name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums text-zinc-300">
                      {row.wins}
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums text-zinc-300">
                      {row.losses}
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums text-zinc-400">
                      {row.runsFor}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-zinc-400">
                      {row.runsAgainst}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="msb-empty-state">
          <p className="text-sm text-zinc-500">No standings yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Upload box scores to populate the table
          </p>
        </div>
      )}
    </Card>
  );
}
