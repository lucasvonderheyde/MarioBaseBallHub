import Link from "next/link";
import { CharacterIcon } from "@/components/CharacterIcon";
import type { TeamStandingRow } from "@/domain/standings/compute-standings";
import { formatCharIdDisplay } from "@/lib/character-display";
import type { TeamCardHighlight } from "@/lib/team-card-highlights";
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
  highlights: Map<string, TeamCardHighlight>;
};

function HighlightRow({
  label,
  charId,
  detail,
}: {
  label: string;
  charId: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CharacterIcon charId={charId} size={22} className="shrink-0 rounded-sm" />
      <div className="min-w-0">
        <span className="text-zinc-500">{label}: </span>
        <span className="text-zinc-200">{formatCharIdDisplay(charId)}</span>
        <span className="text-zinc-500"> · {detail}</span>
      </div>
    </div>
  );
}

export function SeasonHubTeamGrid({
  leagueId,
  seasonId,
  teams,
  standings,
  rosterCounts,
  highlights,
}: Props) {
  const recordByTeam = new Map(
    standings.map((row) => [row.teamId, { wins: row.wins, losses: row.losses }]),
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {teams.map(({ team, manager }) => {
        const record = recordByTeam.get(team.id);
        const rosterCount = rosterCounts.get(team.id) ?? 0;
        const rosterOk = rosterCountMeetsMinimum(rosterCount);
        const teamHighlights = highlights.get(team.id);

        return (
          <Link
            key={team.id}
            href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${team.id}`}
            className="msb-panel flex flex-col p-4 transition hover:border-zinc-600/80 sm:min-h-[11rem]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-msb-gold-bright">{team.name}</p>
                {manager ? (
                  <p className="mt-0.5 truncate text-sm text-zinc-500">@{manager.username}</p>
                ) : (
                  <p className="mt-0.5 text-sm text-zinc-600">Unclaimed</p>
                )}
              </div>
              <p className="shrink-0 text-lg font-semibold tabular-nums text-zinc-200">
                {record ? `${record.wins}–${record.losses}` : "0–0"}
              </p>
            </div>

            <p
              className={`mt-2 text-sm tabular-nums ${
                rosterOk ? "text-zinc-500" : "text-msb-gold-bright"
              }`}
            >
              Roster {rosterCount}/{MIN_TEAM_ROSTER_SIZE}
              {!rosterOk ? " · below minimum" : ""}
            </p>

            {teamHighlights?.hrLeader ||
            teamHighlights?.recentStarter ||
            teamHighlights?.recentReliever ? (
              <div className="mt-3 space-y-1.5 border-t border-zinc-800/80 pt-3">
                {teamHighlights.recentStarter ? (
                  <HighlightRow
                    label="Last SP"
                    charId={teamHighlights.recentStarter.charId}
                    detail="most recent start"
                  />
                ) : null}
                {teamHighlights.recentReliever ? (
                  <HighlightRow
                    label="Last RP"
                    charId={teamHighlights.recentReliever.charId}
                    detail="most recent relief"
                  />
                ) : null}
                {teamHighlights.hrLeader ? (
                  <HighlightRow
                    label="HR leader"
                    charId={teamHighlights.hrLeader.charId}
                    detail={`${teamHighlights.hrLeader.hr} HR`}
                  />
                ) : null}
              </div>
            ) : (
              <p className="mt-3 border-t border-zinc-800/80 pt-3 text-sm text-zinc-600">
                No game stats yet
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
