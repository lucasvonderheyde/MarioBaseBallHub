export type RoundRobinMatch = {
  homeTeamId: string;
  awayTeamId: string;
};

export type RoundRobinRound = {
  roundNumber: number;
  matchups: RoundRobinMatch[];
};

const BYE = "__BYE__";

/** Every team plays every other team exactly once (flat list). */
export function generateRoundRobinPairings(teamIds: string[]): RoundRobinMatch[] {
  return generateRoundRobinRounds(teamIds).flatMap((round) => round.matchups);
}

/**
 * Classic circle-method schedule: each round is one week of simultaneous matchups.
 * Odd team counts get a bye each week.
 */
export function generateRoundRobinRounds(teamIds: string[]): RoundRobinRound[] {
  if (teamIds.length < 2) return [];

  let rotation = [...teamIds];
  if (rotation.length % 2 === 1) {
    rotation.push(BYE);
  }

  const teamCount = rotation.length;
  const roundCount = teamCount - 1;
  const rounds: RoundRobinRound[] = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex++) {
    const matchups: RoundRobinMatch[] = [];

    for (let i = 0; i < teamCount / 2; i++) {
      const a = rotation[i]!;
      const b = rotation[teamCount - 1 - i]!;
      if (a === BYE || b === BYE) continue;

      if (roundIndex % 2 === 0) {
        matchups.push({ homeTeamId: a, awayTeamId: b });
      } else {
        matchups.push({ homeTeamId: b, awayTeamId: a });
      }
    }

    rounds.push({ roundNumber: roundIndex + 1, matchups });

    const fixed = rotation[0]!;
    const rest = rotation.slice(1);
    const last = rest.pop()!;
    rest.unshift(last);
    rotation = [fixed, ...rest];
  }

  return rounds;
}

export function roundRobinGameCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return (teamCount * (teamCount - 1)) / 2;
}

export function roundRobinWeekCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}

export function pairingKey(homeTeamId: string, awayTeamId: string): string {
  return [homeTeamId, awayTeamId].sort().join(":");
}
