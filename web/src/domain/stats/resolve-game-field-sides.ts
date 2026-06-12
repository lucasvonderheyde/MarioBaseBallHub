import type { scheduleGames } from "@/db/schema";

export type GameFieldSides = {
  /** Team that batted first (JSON away side). */
  awayTeamId: string;
  /** Team that batted second / had home field (JSON home side). */
  homeTeamId: string;
  awayPlayer: string | null;
  homePlayer: string | null;
  /** True when away/home came from uploaded stats, not the schedule slot. */
  fromStats: boolean;
};

type ScheduleGameFieldRow = Pick<
  typeof scheduleGames.$inferSelect,
  | "homeTeamId"
  | "awayTeamId"
  | "statsAwayTeamId"
  | "statsHomeTeamId"
  | "statsAwayPlayer"
  | "statsHomePlayer"
>;

export function resolveGameFieldSides(game: ScheduleGameFieldRow): GameFieldSides {
  if (game.statsAwayTeamId && game.statsHomeTeamId) {
    return {
      awayTeamId: game.statsAwayTeamId,
      homeTeamId: game.statsHomeTeamId,
      awayPlayer: game.statsAwayPlayer,
      homePlayer: game.statsHomePlayer,
      fromStats: true,
    };
  }

  return {
    awayTeamId: game.awayTeamId,
    homeTeamId: game.homeTeamId,
    awayPlayer: null,
    homePlayer: null,
    fromStats: false,
  };
}

export function isTeamHomeInGame(teamId: string, sides: GameFieldSides): boolean {
  return sides.homeTeamId === teamId;
}

export function isTeamAwayInGame(teamId: string, sides: GameFieldSides): boolean {
  return sides.awayTeamId === teamId;
}

/**
 * Scores for a team from the stored schedule-slot scores.
 *
 * `scheduleGames.homeScore/awayScore` are always re-oriented to the
 * *scheduled* home/away teams on upload (see buildMapping in
 * match-netplay-teams.ts), even when the uploaded file flipped field
 * sides. Field sides only affect home/away labels, never score mapping.
 */
export function teamScheduleScores(
  teamId: string,
  game: Pick<ScheduleGameFieldRow, "homeTeamId" | "awayTeamId">,
  scheduleAwayScore: number,
  scheduleHomeScore: number,
): { ours: number; theirs: number } | null {
  if (game.homeTeamId === teamId) {
    return { ours: scheduleHomeScore, theirs: scheduleAwayScore };
  }
  if (game.awayTeamId === teamId) {
    return { ours: scheduleAwayScore, theirs: scheduleHomeScore };
  }
  return null;
}
