import type { TeamStandingRow } from "@/domain/standings/compute-standings";

export type TeamPowerInput = {
  teamId: string;
  rosterTalent: number;
  standing?: TeamStandingRow;
  gamesPlayed: number;
};

/**
 * Blends draft-time roster talent with in-season results.
 * Early season leans on character ratings; later weeks weight record and run differential.
 */
export function computeTeamPowerRating(input: TeamPowerInput): number {
  const { rosterTalent, standing, gamesPlayed } = input;
  const seasonBlend = Math.min(1, gamesPlayed / 5);
  const rosterWeight = 1 - seasonBlend * 0.7;

  let seasonScore = 0;
  if (standing && gamesPlayed > 0) {
    const total = standing.wins + standing.losses;
    const winPct = standing.wins / total;
    const runDiff = standing.runsFor - standing.runsAgainst;
    const runsPerGame = standing.runsFor / gamesPlayed;
    seasonScore =
      winPct * 42 +
      runDiff * 0.45 +
      runsPerGame * 1.8 -
      (standing.runsAgainst / gamesPlayed) * 0.6;
  }

  return rosterTalent * rosterWeight + seasonScore * seasonBlend;
}

export function championshipOddsFromPower(
  powers: { teamId: string; power: number }[],
): Map<string, number> {
  if (powers.length === 0) return new Map();

  const temperature = 10;
  const maxPower = Math.max(...powers.map((row) => row.power));
  const weights = powers.map((row) =>
    Math.exp((row.power - maxPower) / temperature),
  );
  const total = weights.reduce((sum, w) => sum + w, 0);

  const odds = new Map<string, number>();
  for (let i = 0; i < powers.length; i++) {
    odds.set(powers[i]!.teamId, weights[i]! / total);
  }
  return odds;
}
