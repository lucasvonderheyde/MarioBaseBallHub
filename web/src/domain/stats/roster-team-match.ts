export type TeamRosterSnapshot = {
  teamId: string;
  charIds: string[];
};

function overlapCount(fileChars: string[], rosterChars: string[]): number {
  const roster = new Set(rosterChars);
  let matches = 0;
  for (const charId of fileChars) {
    if (roster.has(charId)) matches++;
  }
  return matches;
}

function assignmentScore(
  awaySideTeamId: string,
  homeSideTeamId: string,
  awayCharIds: string[],
  homeCharIds: string[],
  rosters: Map<string, string[]>,
): number {
  return (
    overlapCount(awayCharIds, rosters.get(awaySideTeamId) ?? []) +
    overlapCount(homeCharIds, rosters.get(homeSideTeamId) ?? [])
  );
}

/** Picks which schedule team owned the JSON away/home rosters using character overlap. */
export function matchTeamsByRosterOverlap(
  awayCharIds: string[],
  homeCharIds: string[],
  scheduleHomeTeamId: string,
  scheduleAwayTeamId: string,
  teamRosters: TeamRosterSnapshot[],
): {
  awaySideTeamId: string;
  homeSideTeamId: string;
  score: number;
} | null {
  if (awayCharIds.length === 0 && homeCharIds.length === 0) return null;

  const rosters = new Map(teamRosters.map((team) => [team.teamId, team.charIds]));
  const candidates = [
    {
      awaySideTeamId: scheduleAwayTeamId,
      homeSideTeamId: scheduleHomeTeamId,
    },
    {
      awaySideTeamId: scheduleHomeTeamId,
      homeSideTeamId: scheduleAwayTeamId,
    },
  ];

  let best = candidates[0]!;
  let bestScore = -1;
  for (const candidate of candidates) {
    const score = assignmentScore(
      candidate.awaySideTeamId,
      candidate.homeSideTeamId,
      awayCharIds,
      homeCharIds,
      rosters,
    );
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (bestScore <= 0) return null;
  return { ...best, score: bestScore };
}

export function charIdsForSide(
  characterStats: { teamSide: "Away" | "Home"; charId: string }[],
  side: "Away" | "Home",
): string[] {
  return characterStats.filter((row) => row.teamSide === side).map((row) => row.charId);
}
