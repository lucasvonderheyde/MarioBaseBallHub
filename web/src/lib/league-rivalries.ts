import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { rounds, scheduleGames, seasons, teams, users } from "@/db/schema";

export type LeagueRivalryManager = {
  id: string;
  name: string;
};

export type LeagueRivalry = {
  managerA: LeagueRivalryManager;
  managerB: LeagueRivalryManager;
  games: number;
  aWins: number;
  bWins: number;
  totalRunsA: number;
  totalRunsB: number;
  /** Average absolute run margin — lower means closer games. */
  avgMargin: number;
  lastPlayedAt: Date | null;
  /** Composite ranking: meetings, closeness, and series tension. */
  heat: number;
};

/**
 * Manager-vs-manager rivalry aggregates for one league, ranked by "heat":
 * more meetings, closer scores, and tighter series all raise the score.
 */
export async function getLeagueRivalries(leagueId: string): Promise<LeagueRivalry[]> {
  const seasonRows = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));
  if (seasonRows.length === 0) return [];
  const seasonIds = seasonRows.map((row) => row.id);

  const homeTeams = db
    .select({ id: teams.id, managerUserId: teams.managerUserId })
    .from(teams)
    .as("home_teams");
  const awayTeams = db
    .select({ id: teams.id, managerUserId: teams.managerUserId })
    .from(teams)
    .as("away_teams");

  const games = await db
    .select({
      homeManagerId: homeTeams.managerUserId,
      awayManagerId: awayTeams.managerUserId,
      homeScore: scheduleGames.homeScore,
      awayScore: scheduleGames.awayScore,
      playedAt: scheduleGames.playedAt,
    })
    .from(scheduleGames)
    .innerJoin(rounds, eq(scheduleGames.roundId, rounds.id))
    .innerJoin(homeTeams, eq(scheduleGames.homeTeamId, homeTeams.id))
    .innerJoin(awayTeams, eq(scheduleGames.awayTeamId, awayTeams.id))
    .where(
      and(
        inArray(rounds.seasonId, seasonIds),
        isNotNull(scheduleGames.homeScore),
        isNotNull(scheduleGames.awayScore),
        isNotNull(scheduleGames.playedAt),
      ),
    );

  type PairTotals = {
    aId: string;
    bId: string;
    games: number;
    aWins: number;
    bWins: number;
    runsA: number;
    runsB: number;
    marginSum: number;
    lastPlayedAt: Date | null;
  };
  const pairs = new Map<string, PairTotals>();

  for (const game of games) {
    if (!game.homeManagerId || !game.awayManagerId) continue;
    if (game.homeManagerId === game.awayManagerId) continue;
    const [aId, bId] = [game.homeManagerId, game.awayManagerId].sort();
    const key = `${aId}\0${bId}`;
    const totals =
      pairs.get(key) ??
      ({
        aId,
        bId,
        games: 0,
        aWins: 0,
        bWins: 0,
        runsA: 0,
        runsB: 0,
        marginSum: 0,
        lastPlayedAt: null,
      } satisfies PairTotals);

    const homeIsA = game.homeManagerId === aId;
    const runsA = homeIsA ? game.homeScore! : game.awayScore!;
    const runsB = homeIsA ? game.awayScore! : game.homeScore!;
    totals.games += 1;
    totals.runsA += runsA;
    totals.runsB += runsB;
    totals.marginSum += Math.abs(runsA - runsB);
    if (runsA > runsB) totals.aWins += 1;
    if (runsB > runsA) totals.bWins += 1;
    if (
      game.playedAt &&
      (!totals.lastPlayedAt || game.playedAt > totals.lastPlayedAt)
    ) {
      totals.lastPlayedAt = game.playedAt;
    }
    pairs.set(key, totals);
  }

  const managerIds = [
    ...new Set([...pairs.values()].flatMap((pair) => [pair.aId, pair.bId])),
  ];
  if (managerIds.length === 0) return [];
  const managerRows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(users)
    .where(inArray(users.id, managerIds));
  const managerName = new Map(
    managerRows.map((row) => [row.id, row.displayName ?? row.username]),
  );

  return [...pairs.values()]
    .map((pair) => {
      const avgMargin = pair.games > 0 ? pair.marginSum / pair.games : 0;
      const seriesTension =
        pair.games > 0 ? 1 - Math.abs(pair.aWins - pair.bWins) / pair.games : 0;
      const closeness = 1 / (1 + avgMargin);
      const heat = pair.games * (0.5 + closeness + seriesTension);
      return {
        managerA: { id: pair.aId, name: managerName.get(pair.aId) ?? "Manager" },
        managerB: { id: pair.bId, name: managerName.get(pair.bId) ?? "Manager" },
        games: pair.games,
        aWins: pair.aWins,
        bWins: pair.bWins,
        totalRunsA: pair.runsA,
        totalRunsB: pair.runsB,
        avgMargin,
        lastPlayedAt: pair.lastPlayedAt,
        heat,
      };
    })
    .sort((a, b) => b.heat - a.heat);
}
