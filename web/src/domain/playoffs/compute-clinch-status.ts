import type { TeamStandingRow } from "@/domain/standings/compute-standings";
import type { PlayoffSettings } from "@/domain/playoffs/playoff-settings";
import { playInEnabled } from "@/domain/playoffs/playoff-settings";

export type ClinchBadge =
  | "clinched-playoffs"
  | "clinched-top-seed"
  | "clinched-home-field";

export type TeamClinchStatus = {
  teamId: string;
  badges: ClinchBadge[];
};

type RemainingGame = {
  homeTeamId: string;
  awayTeamId: string;
};

/**
 * Simplified clinch math: assumes each remaining game is independent and
 * teams win/lose all remaining games in best/worst case combinations.
 */
export function computeClinchStatus(input: {
  standings: TeamStandingRow[];
  settings: PlayoffSettings;
  remainingRegularGames: RemainingGame[];
}): TeamClinchStatus[] {
  const { standings, settings, remainingRegularGames } = input;
  const playIn = playInEnabled(settings);
  const playoffSpots =
    settings.autoQualifyCount + (playIn ? settings.playInSpots : 0);

  const remainingByTeam = new Map<string, number>();
  for (const team of standings) {
    remainingByTeam.set(team.teamId, 0);
  }
  for (const game of remainingRegularGames) {
    remainingByTeam.set(
      game.homeTeamId,
      (remainingByTeam.get(game.homeTeamId) ?? 0) + 1,
    );
    remainingByTeam.set(
      game.awayTeamId,
      (remainingByTeam.get(game.awayTeamId) ?? 0) + 1,
    );
  }

  return standings.map((team, index) => {
    const badges: ClinchBadge[] = [];
    const remaining = remainingByTeam.get(team.teamId) ?? 0;
    const maxWins = team.wins + remaining;

    const teamsBelowCanCatch = standings.some((other, otherIndex) => {
      if (otherIndex <= index) return false;
      const otherRemaining = remainingByTeam.get(other.teamId) ?? 0;
      return other.wins + otherRemaining > maxWins;
    });

    if (!teamsBelowCanCatch && index === 0) {
      badges.push("clinched-top-seed");
      if (settings.higherSeedHomeField) {
        badges.push("clinched-home-field");
      }
    } else if (
      settings.higherSeedHomeField &&
      index === 0 &&
      !teamsBelowCanCatch
    ) {
      badges.push("clinched-home-field");
    }

    const cutoffIndex = playoffSpots - 1;
    const canFallOutOfPlayoffs = standings.some((other, otherIndex) => {
      if (otherIndex <= index) return false;
      if (otherIndex > cutoffIndex + remaining) return false;
      const otherRemaining = remainingByTeam.get(other.teamId) ?? 0;
      const otherMaxWins = other.wins + otherRemaining;
      return otherMaxWins > maxWins;
    });

    if (index <= cutoffIndex && !canFallOutOfPlayoffs && playoffSpots > 0) {
      badges.push("clinched-playoffs");
    }

    return { teamId: team.teamId, badges };
  });
}
