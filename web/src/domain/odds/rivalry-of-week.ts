import type { FinishedGame } from "@/domain/standings/compute-standings";
import { computeGameWinProbability } from "@/domain/odds/game-win-probability";

export type UnplayedScheduleGame = {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  roundNumber: number;
  phase: "regular" | "playoffs";
  slotInRound: number;
};

export type RivalryPickReason =
  | "close_records"
  | "underdog_battle"
  | "standings_race"
  | "h2h_drama"
  | "playoff_stakes";

export type RivalryOfWeekPick = {
  game: UnplayedScheduleGame;
  weekNumber: number;
  excitementScore: number;
  reasons: RivalryPickReason[];
  homeWinPct: number;
  awayWinPct: number;
};

type StandingSnapshot = {
  teamId: string;
  wins: number;
  losses: number;
  rank: number;
};

function isUnplayed(game: { statsRawJson?: string | null; homeScore: number | null; awayScore: number | null }): boolean {
  return game.homeScore == null || game.awayScore == null || !game.statsRawJson;
}

function h2hRecord(
  teamA: string,
  teamB: string,
  games: FinishedGame[],
): { winsA: number; winsB: number; oneRunGames: number } {
  let winsA = 0;
  let winsB = 0;
  let oneRunGames = 0;

  for (const game of games) {
    const isPair =
      (game.homeTeamId === teamA && game.awayTeamId === teamB) ||
      (game.homeTeamId === teamB && game.awayTeamId === teamA);
    if (!isPair) continue;

    const margin = Math.abs(game.homeScore - game.awayScore);
    if (margin === 1) oneRunGames++;

    const homeWon = game.homeScore > game.awayScore;
    if (game.homeTeamId === teamA && homeWon) winsA++;
    if (game.awayTeamId === teamA && !homeWon) winsA++;
    if (game.homeTeamId === teamB && homeWon) winsB++;
    if (game.awayTeamId === teamB && !homeWon) winsB++;
  }

  return { winsA, winsB, oneRunGames };
}

function winPct(wins: number, losses: number): number {
  const total = wins + losses;
  return total > 0 ? wins / total : 0.5;
}

function scoreMatchupExcitement(input: {
  home: StandingSnapshot;
  away: StandingSnapshot;
  h2h: { winsA: number; winsB: number; oneRunGames: number };
  phase: "regular" | "playoffs";
}): { score: number; reasons: RivalryPickReason[] } {
  const reasons: RivalryPickReason[] = [];
  let score = 0;

  const homePct = winPct(input.home.wins, input.home.losses);
  const awayPct = winPct(input.away.wins, input.away.losses);
  const avgPct = (homePct + awayPct) / 2;

  const recordGap = Math.abs(homePct - awayPct);
  if (recordGap <= 0.15) {
    score += 22;
    reasons.push("close_records");
  } else if (recordGap <= 0.25) {
    score += 12;
    reasons.push("close_records");
  }

  if (avgPct <= 0.42) {
    score += 28;
    reasons.push("underdog_battle");
  } else if (avgPct <= 0.5) {
    score += 16;
    reasons.push("underdog_battle");
  }

  const rankGap = Math.abs(input.home.rank - input.away.rank);
  if (rankGap <= 2) {
    score += 24;
    reasons.push("standings_race");
  } else if (rankGap <= 4) {
    score += 14;
    reasons.push("standings_race");
  }

  const h2hTotal = input.h2h.winsA + input.h2h.winsB;
  if (h2hTotal > 0) {
    const split = 1 - Math.abs(input.h2h.winsA - input.h2h.winsB) / h2hTotal;
    score += split * 18 + input.h2h.oneRunGames * 6;
    reasons.push("h2h_drama");
  }

  if (input.phase === "playoffs") {
    score += 30;
    reasons.push("playoff_stakes");
  }

  return { score, reasons: [...new Set(reasons)] };
}

export function pickRivalryOfWeek(input: {
  games: (UnplayedScheduleGame & {
    statsRawJson?: string | null;
    homeScore: number | null;
    awayScore: number | null;
  })[];
  standings: StandingSnapshot[];
  finishedGames: FinishedGame[];
  teamPowers: Map<string, number>;
  preferPlayoffs?: boolean;
}): RivalryOfWeekPick | null {
  const standingById = new Map(input.standings.map((row) => [row.teamId, row]));

  const candidates = input.games.filter((game) => {
    if (!isUnplayed(game)) return false;
    if (input.preferPlayoffs) return game.phase === "playoffs";
    return game.phase === "regular";
  });

  if (candidates.length === 0 && input.preferPlayoffs) {
    return pickRivalryOfWeek({ ...input, preferPlayoffs: false });
  }
  if (candidates.length === 0) return null;

  const targetWeek = Math.min(...candidates.map((g) => g.roundNumber));
  const weekGames = candidates.filter((g) => g.roundNumber === targetWeek);

  let best: RivalryOfWeekPick | null = null;

  for (const game of weekGames) {
    const home = standingById.get(game.homeTeamId);
    const away = standingById.get(game.awayTeamId);
    if (!home || !away) continue;

    const h2h = h2hRecord(game.awayTeamId, game.homeTeamId, input.finishedGames);
    const { score, reasons } = scoreMatchupExcitement({
      home,
      away,
      h2h: { winsA: h2h.winsA, winsB: h2h.winsB, oneRunGames: h2h.oneRunGames },
      phase: game.phase,
    });

    const homePower = input.teamPowers.get(game.homeTeamId) ?? 50;
    const awayPower = input.teamPowers.get(game.awayTeamId) ?? 50;
    const odds = computeGameWinProbability({
      homePower,
      awayPower,
      h2hHomeWins: h2h.winsB,
      h2hAwayWins: h2h.winsA,
    });

    const pick: RivalryOfWeekPick = {
      game,
      weekNumber: targetWeek,
      excitementScore: score,
      reasons,
      homeWinPct: odds.homeWinPct,
      awayWinPct: odds.awayWinPct,
    };

    if (
      !best ||
      pick.excitementScore > best.excitementScore ||
      (pick.excitementScore === best.excitementScore &&
        pick.game.slotInRound < best.game.slotInRound)
    ) {
      best = pick;
    }
  }

  return best;
}

export function rivalryReasonLabel(reason: RivalryPickReason): string {
  switch (reason) {
    case "close_records":
      return "Similar records";
    case "underdog_battle":
      return "Underdog showdown";
    case "standings_race":
      return "Standings implications";
    case "h2h_drama":
      return "Head-to-head history";
    case "playoff_stakes":
      return "Playoff stakes";
  }
}
