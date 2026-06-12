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
 * Conservative clinch math: a badge is only awarded when no combination of
 * remaining results can take it away. Ties on wins are treated as losable
 * (tiebreakers are not evaluated), so badges may appear a game later than a
 * full simulation would show, but never prematurely.
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

  return standings.map((team) => {
    const badges: ClinchBadge[] = [];

    // Worst case for this team: it loses out, finishing on its current wins.
    // Another team can still finish ahead if its best case reaches that
    // total (equal wins could go either way on tiebreakers).
    const othersWhoCanFinishAhead = standings.filter((other) => {
      if (other.teamId === team.teamId) return false;
      const otherRemaining = remainingByTeam.get(other.teamId) ?? 0;
      return other.wins + otherRemaining >= team.wins;
    }).length;

    if (othersWhoCanFinishAhead === 0) {
      badges.push("clinched-top-seed");
      if (settings.higherSeedHomeField) {
        badges.push("clinched-home-field");
      }
    }

    if (playoffSpots > 0 && othersWhoCanFinishAhead < playoffSpots) {
      badges.push("clinched-playoffs");
    }

    return { teamId: team.teamId, badges };
  });
}
