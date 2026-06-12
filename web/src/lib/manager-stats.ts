import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { scheduleGames, teams, users } from "@/db/schema";
import {
  battingAverage,
  onBasePercentage,
  sluggingPercentage,
  type BattingTotals,
} from "@/domain/stats/batting-metrics";
import {
  aggregateBattingByCharId,
  aggregatePitchingByCharId,
  type BattingLine,
  type PitchingLine,
} from "@/lib/game-stats-queries";
import {
  aggregatePersonalBattingByCharId,
  aggregatePersonalPitchingByCharId,
  mergeBattingMaps,
  mergePitchingMaps,
} from "@/lib/personal-game-stats";
import { countManagerUploadedGames } from "@/lib/manager-uploaded-games";

export type ManagerCharacterBatting = { charId: string; line: BattingLine };
export type ManagerCharacterPitching = { charId: string; line: PitchingLine };

export type ManagerLifetimeStats = {
  uploadedGames: number;
  batting: BattingLine;
  pitching: PitchingLine;
  characterBatting: ManagerCharacterBatting[];
  characterPitching: ManagerCharacterPitching[];
};

export type HeadToHeadRecord = {
  opponentUserId: string;
  opponentUsername: string;
  opponentDisplayName: string | null;
  games: number;
  wins: number;
  losses: number;
  runsFor: number;
  runsAgainst: number;
};

function emptyLifetimeBatting(): BattingLine {
  return {
    charId: "_lifetime",
    charOccurrenceIndex: 0,
    games: 0,
    ab: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    walks4ball: 0,
    walksHbp: 0,
    sacFly: 0,
    rbi: 0,
    ba: null,
    obp: null,
    slg: null,
  };
}

function emptyLifetimePitching(): PitchingLine {
  return {
    charId: "_lifetime",
    charOccurrenceIndex: 0,
    games: 0,
    gamesStarted: 0,
    reliefAppearances: 0,
    outsPitched: 0,
    battersFaced: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walks: 0,
    strikeouts: 0,
    hrAllowed: 0,
    pitchesThrown: 0,
  };
}

export async function getManagerLifetimeStats(
  managerUserId: string,
): Promise<ManagerLifetimeStats> {
  const [
    uploadedGames,
    leagueBatting,
    leaguePitching,
    personalBatting,
    personalPitching,
  ] = await Promise.all([
    countManagerUploadedGames(managerUserId),
    aggregateBattingByCharId({ managerUserId }),
    aggregatePitchingByCharId({ managerUserId }),
    aggregatePersonalBattingByCharId(managerUserId),
    aggregatePersonalPitchingByCharId(managerUserId),
  ]);

  const battingMap = mergeBattingMaps(leagueBatting, personalBatting);
  const pitchingMap = mergePitchingMaps(leaguePitching, personalPitching);

  const characterBatting = [...battingMap.entries()]
    .map(([charId, line]) => ({ charId, line }))
    .filter(({ line }) => line.ab > 0 || line.games > 0)
    .sort((a, b) => b.line.ab - a.line.ab);

  const characterPitching = [...pitchingMap.entries()]
    .map(([charId, line]) => ({ charId, line }))
    .filter(
      ({ line }) =>
        line.outsPitched > 0 || line.battersFaced > 0 || line.games > 0,
    )
    .sort((a, b) => b.line.outsPitched - a.line.outsPitched);

  const battingTotals = [...battingMap.values()].reduce<BattingTotals>(
    (acc, line) => ({
      games: 0,
      ab: acc.ab + line.ab,
      hits: acc.hits + line.hits,
      singles: acc.singles + line.singles,
      doubles: acc.doubles + line.doubles,
      triples: acc.triples + line.triples,
      hr: acc.hr + line.hr,
      walks4ball: acc.walks4ball + line.walks4ball,
      walksHbp: acc.walksHbp + line.walksHbp,
      sacFly: acc.sacFly + line.sacFly,
      rbi: acc.rbi + line.rbi,
    }),
    {
      games: 0,
      ab: 0,
      hits: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      walks4ball: 0,
      walksHbp: 0,
      sacFly: 0,
      rbi: 0,
    },
  );

  const pitchingLines = [...pitchingMap.values()];
  const batting: BattingLine =
    battingTotals.ab > 0
      ? {
          charId: "_lifetime",
          charOccurrenceIndex: 0,
          ...battingTotals,
          games: uploadedGames,
          ba: battingAverage(battingTotals),
          obp: onBasePercentage(battingTotals),
          slg: sluggingPercentage(battingTotals),
        }
      : { ...emptyLifetimeBatting(), games: uploadedGames };

  const pitching: PitchingLine =
    pitchingLines.length > 0
      ? {
          charId: "_lifetime",
          charOccurrenceIndex: 0,
          games: uploadedGames,
          gamesStarted: pitchingLines.reduce((sum, line) => sum + line.gamesStarted, 0),
          reliefAppearances: pitchingLines.reduce(
            (sum, line) => sum + line.reliefAppearances,
            0,
          ),
          outsPitched: pitchingLines.reduce((sum, line) => sum + line.outsPitched, 0),
          battersFaced: pitchingLines.reduce((sum, line) => sum + line.battersFaced, 0),
          hitsAllowed: pitchingLines.reduce((sum, line) => sum + line.hitsAllowed, 0),
          runsAllowed: pitchingLines.reduce((sum, line) => sum + line.runsAllowed, 0),
          earnedRuns: pitchingLines.reduce((sum, line) => sum + line.earnedRuns, 0),
          walks: pitchingLines.reduce((sum, line) => sum + line.walks, 0),
          strikeouts: pitchingLines.reduce((sum, line) => sum + line.strikeouts, 0),
          hrAllowed: pitchingLines.reduce((sum, line) => sum + line.hrAllowed, 0),
          pitchesThrown: pitchingLines.reduce((sum, line) => sum + line.pitchesThrown, 0),
        }
      : emptyLifetimePitching();

  return { uploadedGames, batting, pitching, characterBatting, characterPitching };
}

export async function getManagerHeadToHeadRecords(
  managerUserId: string,
): Promise<HeadToHeadRecord[]> {
  const homeTeams = db
    .select({ id: teams.id, managerUserId: teams.managerUserId })
    .from(teams)
    .as("home_teams");
  const awayTeams = db
    .select({ id: teams.id, managerUserId: teams.managerUserId })
    .from(teams)
    .as("away_teams");

  const rows = await db
    .select({
      homeScore: scheduleGames.homeScore,
      awayScore: scheduleGames.awayScore,
      homeManagerId: homeTeams.managerUserId,
      awayManagerId: awayTeams.managerUserId,
    })
    .from(scheduleGames)
    .innerJoin(homeTeams, eq(scheduleGames.homeTeamId, homeTeams.id))
    .innerJoin(awayTeams, eq(scheduleGames.awayTeamId, awayTeams.id))
    .where(
      and(
        isNotNull(scheduleGames.playedAt),
        isNotNull(scheduleGames.homeScore),
        isNotNull(scheduleGames.awayScore),
        sql`(${homeTeams.managerUserId} = ${managerUserId} OR ${awayTeams.managerUserId} = ${managerUserId})`,
      ),
    );

  const byOpponent = new Map<
    string,
    { wins: number; losses: number; runsFor: number; runsAgainst: number; games: number }
  >();

  for (const row of rows) {
    const isHome = row.homeManagerId === managerUserId;
    const oppId = isHome ? row.awayManagerId : row.homeManagerId;
    if (!oppId || oppId === managerUserId) continue;

    const ours = isHome ? row.homeScore! : row.awayScore!;
    const theirs = isHome ? row.awayScore! : row.homeScore!;
    const bucket = byOpponent.get(oppId) ?? {
      wins: 0,
      losses: 0,
      runsFor: 0,
      runsAgainst: 0,
      games: 0,
    };
    bucket.games++;
    bucket.runsFor += ours;
    bucket.runsAgainst += theirs;
    if (ours > theirs) bucket.wins++;
    else bucket.losses++;
    byOpponent.set(oppId, bucket);
  }

  if (byOpponent.size === 0) return [];

  const opponentUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(users)
    .where(inArray(users.id, [...byOpponent.keys()]));

  const userMap = new Map(opponentUsers.map((u) => [u.id, u]));

  return [...byOpponent.entries()]
    .map(([opponentUserId, record]) => {
      const user = userMap.get(opponentUserId);
      return {
        opponentUserId,
        opponentUsername: user?.username ?? opponentUserId,
        opponentDisplayName: user?.displayName ?? null,
        ...record,
      };
    })
    .sort((a, b) => b.games - a.games);
}
