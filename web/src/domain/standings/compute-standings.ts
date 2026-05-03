import type { TiebreakerKey } from "./tiebreakers";

export type FinishedGame = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

export type TeamStandingRow = {
  teamId: string;
  name: string;
  wins: number;
  losses: number;
  runsFor: number;
  runsAgainst: number;
  needsTiebreakerGame?: boolean;
};

function gamesBetween(
  games: FinishedGame[],
  a: string,
  b: string,
): FinishedGame[] {
  return games.filter(
    (g) =>
      (g.homeTeamId === a && g.awayTeamId === b) ||
      (g.homeTeamId === b && g.awayTeamId === a),
  );
}

function winsInSubset(
  team: string,
  subset: Set<string>,
  games: FinishedGame[],
): number {
  let w = 0;
  for (const g of games) {
    if (!subset.has(g.homeTeamId) || !subset.has(g.awayTeamId)) continue;
    if (g.homeTeamId === team || g.awayTeamId === team) {
      const hf = g.homeScore > g.awayScore;
      const af = g.awayScore > g.homeScore;
      if (g.homeTeamId === team && hf) w++;
      if (g.awayTeamId === team && af) w++;
    }
  }
  return w;
}

function runsInH2h(team: string, opponent: string, games: FinishedGame[]): number {
  let r = 0;
  for (const g of gamesBetween(games, team, opponent)) {
    if (g.homeTeamId === team) r += g.homeScore;
    else r += g.awayScore;
  }
  return r;
}

function h2hWins(team: string, opponent: string, games: FinishedGame[]): number {
  let w = 0;
  for (const g of gamesBetween(games, team, opponent)) {
    if (g.homeScore === g.awayScore) continue;
    const homeWon = g.homeScore > g.awayScore;
    if (g.homeTeamId === team && homeWon) w++;
    if (g.awayTeamId === team && !homeWon) w++;
  }
  return w;
}

function compareTwoTeams(
  a: TeamStandingRow,
  b: TeamStandingRow,
  games: FinishedGame[],
  order: TiebreakerKey[],
): number {
  for (const key of order) {
    if (key === "h2h_record") {
      const aw = h2hWins(a.teamId, b.teamId, games);
      const bw = h2hWins(b.teamId, a.teamId, games);
      if (aw !== bw) return bw - aw;
    }
    if (key === "h2h_runs") {
      const ar = runsInH2h(a.teamId, b.teamId, games);
      const br = runsInH2h(b.teamId, a.teamId, games);
      if (ar !== br) return br - ar;
    }
    if (key === "season_runs") {
      if (a.runsFor !== b.runsFor) return b.runsFor - a.runsFor;
    }
    if (key === "one_game") {
      return 0;
    }
  }
  return 0;
}

function buildTeamRows(
  teamIds: string[],
  teamNames: Map<string, string>,
  games: FinishedGame[],
): TeamStandingRow[] {
  const rows = new Map<string, TeamStandingRow>();
  for (const id of teamIds) {
    rows.set(id, {
      teamId: id,
      name: teamNames.get(id) ?? id,
      wins: 0,
      losses: 0,
      runsFor: 0,
      runsAgainst: 0,
    });
  }
  for (const g of games) {
    const home = rows.get(g.homeTeamId);
    const away = rows.get(g.awayTeamId);
    if (!home || !away) continue;
    home.runsFor += g.homeScore;
    home.runsAgainst += g.awayScore;
    away.runsFor += g.awayScore;
    away.runsAgainst += g.homeScore;
    if (g.homeScore > g.awayScore) {
      home.wins++;
      away.losses++;
    } else if (g.awayScore > g.homeScore) {
      away.wins++;
      home.losses++;
    }
  }
  return teamIds.map((id) => rows.get(id)!);
}

export function computeStandings(
  teamIds: string[],
  teamNames: Map<string, string>,
  games: FinishedGame[],
  tiebreakerOrder: TiebreakerKey[],
): TeamStandingRow[] {
  const rows = buildTeamRows(teamIds, teamNames, games);
  const sorted = [...rows].sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    const tied = rows.filter((r) => r.wins === a.wins);
    if (tied.length <= 1) return 0;
    const subset = new Set(tied.map((t) => t.teamId));
    const subW = (t: TeamStandingRow) => winsInSubset(t.teamId, subset, games);
    const swDiff = subW(b) - subW(a);
    if (swDiff !== 0) return swDiff;
    const cmp = compareTwoTeams(a, b, games, tiebreakerOrder);
    if (cmp !== 0) return cmp;
    return a.name.localeCompare(b.name);
  });
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (a.wins !== b.wins) continue;
    if (
      compareTwoTeams(a, b, games, tiebreakerOrder) === 0 &&
      tiebreakerOrder.includes("one_game")
    ) {
      a.needsTiebreakerGame = true;
      b.needsTiebreakerGame = true;
    }
  }
  return sorted;
}
