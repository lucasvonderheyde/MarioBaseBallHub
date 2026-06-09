import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  characterGameStats,
  scheduleGames,
  seasons,
  teams,
  users,
} from "@/db/schema";
import {
  findHighestScoringFullInning,
  findHighestScoringHalfInning,
  parseLineScoreFromEvents,
} from "@/domain/stats/parse-line-score";
import { formatCharIdDisplay } from "@/lib/character-display";

export type SeasonRecordHolder = {
  id: string;
  category: string;
  title: string;
  value: number;
  valueLabel: string;
  detail: string;
  charId?: string;
  charDisplayName?: string;
  managerUsername?: string | null;
  managerDisplayName?: string | null;
  teamName?: string;
  gameId: string;
  leagueId: string;
  seasonId: string;
  matchup: string;
  playedAt: Date | null;
};

type CharacterStatField =
  | "hr"
  | "rbi"
  | "hits"
  | "strikeoutsOff"
  | "basesStolen"
  | "strikeoutsDef"
  | "runsAllowed";

const CHARACTER_RECORDS: {
  field: CharacterStatField;
  category: string;
  title: string;
  format: (value: number) => string;
  detail: (value: number, charName: string) => string;
}[] = [
  {
    field: "hr",
    category: "most_hr",
    title: "Most home runs (game)",
    format: (v) => String(v),
    detail: (v, char) => `${char} hit ${v} HR`,
  },
  {
    field: "rbi",
    category: "most_rbi",
    title: "Most RBI (game)",
    format: (v) => String(v),
    detail: (v, char) => `${char} drove in ${v}`,
  },
  {
    field: "hits",
    category: "most_hits",
    title: "Most hits (game)",
    format: (v) => String(v),
    detail: (v, char) => `${char} collected ${v} hits`,
  },
  {
    field: "strikeoutsOff",
    category: "most_k_batting",
    title: "Most strikeouts (game)",
    format: (v) => String(v),
    detail: (v, char) => `${char} struck out ${v} times`,
  },
  {
    field: "basesStolen",
    category: "most_sb",
    title: "Most stolen bases (game)",
    format: (v) => String(v),
    detail: (v, char) => `${char} stole ${v} base${v === 1 ? "" : "s"}`,
  },
  {
    field: "strikeoutsDef",
    category: "most_k_pitching",
    title: "Most strikeouts pitched (game)",
    format: (v) => String(v),
    detail: (v, char) => `${char} fanned ${v}`,
  },
  {
    field: "runsAllowed",
    category: "most_r_allowed",
    title: "Most runs allowed (game)",
    format: (v) => String(v),
    detail: (v, char) => `${char} allowed ${v} runs`,
  },
];

async function loadSeasonContext(seasonId: string) {
  const [season] = await db
    .select({ leagueId: seasons.leagueId })
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  return season ?? null;
}

async function topCharacterRecord(
  seasonId: string,
  leagueId: string,
  field: CharacterStatField,
  meta: (typeof CHARACTER_RECORDS)[number],
): Promise<SeasonRecordHolder | null> {
  const column = characterGameStats[field];
  const [top] = await db
    .select({ value: column })
    .from(characterGameStats)
    .where(and(eq(characterGameStats.seasonId, seasonId), sql`${column} > 0`))
    .orderBy(desc(column))
    .limit(1);
  if (!top || top.value <= 0) return null;

  const rows = await db
    .select({
      gameId: characterGameStats.gameId,
      charId: characterGameStats.charId,
      value: column,
      teamName: teams.name,
      managerUsername: users.username,
      managerDisplayName: users.displayName,
      homeScore: scheduleGames.homeScore,
      awayScore: scheduleGames.awayScore,
      playedAt: scheduleGames.playedAt,
      homeTeamId: scheduleGames.homeTeamId,
      awayTeamId: scheduleGames.awayTeamId,
    })
    .from(characterGameStats)
    .innerJoin(scheduleGames, eq(characterGameStats.gameId, scheduleGames.id))
    .innerJoin(teams, eq(characterGameStats.teamId, teams.id))
    .leftJoin(users, eq(teams.managerUserId, users.id))
    .where(
      and(eq(characterGameStats.seasonId, seasonId), eq(column, top.value)),
    );

  const teamNames = new Map(
    (
      await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.seasonId, seasonId))
    ).map((team) => [team.id, team.name]),
  );

  const row = rows[0];
  if (!row) return null;

  const charName = formatCharIdDisplay(row.charId);
  const awayName = teamNames.get(row.awayTeamId) ?? "Away";
  const homeName = teamNames.get(row.homeTeamId) ?? "Home";

  return {
    id: `${meta.category}-${row.gameId}-${row.charId}`,
    category: meta.category,
    title: meta.title,
    value: row.value,
    valueLabel: meta.format(row.value),
    detail: meta.detail(row.value, charName),
    charId: row.charId,
    charDisplayName: charName,
    managerUsername: row.managerUsername,
    managerDisplayName: row.managerDisplayName,
    teamName: row.teamName,
    gameId: row.gameId,
    leagueId,
    seasonId,
    matchup: `${awayName} ${row.awayScore}–${row.homeScore} ${homeName}`,
    playedAt: row.playedAt,
  };
}

async function topTeamScoreRecord(
  seasonId: string,
  leagueId: string,
): Promise<SeasonRecordHolder | null> {
  const games = await db
    .select({
      id: scheduleGames.id,
      homeScore: scheduleGames.homeScore,
      awayScore: scheduleGames.awayScore,
      homeTeamId: scheduleGames.homeTeamId,
      awayTeamId: scheduleGames.awayTeamId,
      playedAt: scheduleGames.playedAt,
    })
    .from(scheduleGames)
    .innerJoin(
      characterGameStats,
      eq(characterGameStats.gameId, scheduleGames.id),
    )
    .where(
      and(
        eq(characterGameStats.seasonId, seasonId),
        isNotNull(scheduleGames.homeScore),
        isNotNull(scheduleGames.awayScore),
      ),
    )
    .groupBy(scheduleGames.id);

  if (games.length === 0) return null;

  const teamNames = new Map(
    (
      await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.seasonId, seasonId))
    ).map((team) => [team.id, team.name]),
  );

  let best: {
    gameId: string;
    teamName: string;
    runs: number;
    homeScore: number;
    awayScore: number;
    awayTeamId: string;
    homeTeamId: string;
    playedAt: Date | null;
  } | null = null;

  for (const game of games) {
    const homeScore = game.homeScore!;
    const awayScore = game.awayScore!;
    const candidates = [
      { teamId: game.homeTeamId, runs: homeScore },
      { teamId: game.awayTeamId, runs: awayScore },
    ];
    for (const candidate of candidates) {
      if (!best || candidate.runs > best.runs) {
        best = {
          gameId: game.id,
          teamName: teamNames.get(candidate.teamId) ?? "Team",
          runs: candidate.runs,
          homeScore,
          awayScore,
          awayTeamId: game.awayTeamId,
          homeTeamId: game.homeTeamId,
          playedAt: game.playedAt,
        };
      }
    }
  }

  if (!best) return null;
  const awayName = teamNames.get(best.awayTeamId) ?? "Away";
  const homeName = teamNames.get(best.homeTeamId) ?? "Home";

  return {
    id: `team_runs-${best.gameId}`,
    category: "team_runs",
    title: "Most runs by one team (game)",
    value: best.runs,
    valueLabel: String(best.runs),
    detail: `${best.teamName} scored ${best.runs}`,
    teamName: best.teamName,
    gameId: best.gameId,
    leagueId,
    seasonId,
    matchup: `${awayName} ${best.awayScore}–${best.homeScore} ${homeName}`,
    playedAt: best.playedAt,
  };
}

async function topShootoutRecord(
  seasonId: string,
  leagueId: string,
): Promise<SeasonRecordHolder | null> {
  const games = await db
    .select({
      id: scheduleGames.id,
      homeScore: scheduleGames.homeScore,
      awayScore: scheduleGames.awayScore,
      homeTeamId: scheduleGames.homeTeamId,
      awayTeamId: scheduleGames.awayTeamId,
      playedAt: scheduleGames.playedAt,
    })
    .from(scheduleGames)
    .innerJoin(
      characterGameStats,
      eq(characterGameStats.gameId, scheduleGames.id),
    )
    .where(
      and(
        eq(characterGameStats.seasonId, seasonId),
        isNotNull(scheduleGames.homeScore),
        isNotNull(scheduleGames.awayScore),
      ),
    )
    .groupBy(scheduleGames.id);

  if (games.length === 0) return null;

  let game: (typeof games)[number] | null = null;
  let total = 0;
  for (const row of games) {
    if (row.homeScore == null || row.awayScore == null) continue;
    const combined = row.homeScore + row.awayScore;
    if (!game || combined > total) {
      game = row;
      total = combined;
    }
  }

  if (!game || game.homeScore == null || game.awayScore == null) return null;

  const teamNames = new Map(
    (
      await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.seasonId, seasonId))
    ).map((team) => [team.id, team.name]),
  );

  const awayName = teamNames.get(game.awayTeamId) ?? "Away";
  const homeName = teamNames.get(game.homeTeamId) ?? "Home";

  return {
    id: `shootout-${game.id}`,
    category: "shootout",
    title: "Highest-scoring game",
    value: total,
    valueLabel: String(total),
    detail: `${total} combined runs`,
    gameId: game.id,
    leagueId,
    seasonId,
    matchup: `${awayName} ${game.awayScore}–${game.homeScore} ${homeName}`,
    playedAt: game.playedAt,
  };
}

async function topBlowoutRecord(
  seasonId: string,
  leagueId: string,
): Promise<SeasonRecordHolder | null> {
  const games = await db
    .select({
      id: scheduleGames.id,
      homeScore: scheduleGames.homeScore,
      awayScore: scheduleGames.awayScore,
      homeTeamId: scheduleGames.homeTeamId,
      awayTeamId: scheduleGames.awayTeamId,
      playedAt: scheduleGames.playedAt,
    })
    .from(scheduleGames)
    .innerJoin(
      characterGameStats,
      eq(characterGameStats.gameId, scheduleGames.id),
    )
    .where(
      and(
        eq(characterGameStats.seasonId, seasonId),
        isNotNull(scheduleGames.homeScore),
        isNotNull(scheduleGames.awayScore),
      ),
    )
    .groupBy(scheduleGames.id);

  if (games.length === 0) return null;

  const teamNames = new Map(
    (
      await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.seasonId, seasonId))
    ).map((team) => [team.id, team.name]),
  );

  let best: (typeof games)[number] & { margin: number; winnerName: string } | null =
    null;

  for (const game of games) {
    const margin = Math.abs(game.homeScore! - game.awayScore!);
    if (margin <= 0) continue;
    const winnerId =
      game.homeScore! > game.awayScore! ? game.homeTeamId : game.awayTeamId;
    if (!best || margin > best.margin) {
      best = {
        ...game,
        margin,
        winnerName: teamNames.get(winnerId) ?? "Winner",
      };
    }
  }

  if (!best) return null;
  const awayName = teamNames.get(best.awayTeamId) ?? "Away";
  const homeName = teamNames.get(best.homeTeamId) ?? "Home";

  return {
    id: `blowout-${best.id}`,
    category: "blowout",
    title: "Biggest blowout",
    value: best.margin,
    valueLabel: `+${best.margin}`,
    detail: `${best.winnerName} won by ${best.margin}`,
    teamName: best.winnerName,
    gameId: best.id,
    leagueId,
    seasonId,
    matchup: `${awayName} ${best.awayScore}–${best.homeScore} ${homeName}`,
    playedAt: best.playedAt,
  };
}

async function topInningRecords(
  seasonId: string,
  leagueId: string,
): Promise<SeasonRecordHolder[]> {
  const games = await db
    .select({
      id: scheduleGames.id,
      statsRawJson: scheduleGames.statsRawJson,
      homeScore: scheduleGames.homeScore,
      awayScore: scheduleGames.awayScore,
      homeTeamId: scheduleGames.homeTeamId,
      awayTeamId: scheduleGames.awayTeamId,
      playedAt: scheduleGames.playedAt,
    })
    .from(scheduleGames)
    .innerJoin(
      characterGameStats,
      eq(characterGameStats.gameId, scheduleGames.id),
    )
    .where(
      and(
        eq(characterGameStats.seasonId, seasonId),
        isNotNull(scheduleGames.statsRawJson),
      ),
    )
    .groupBy(scheduleGames.id);

  const teamNames = new Map(
    (
      await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.seasonId, seasonId))
    ).map((team) => [team.id, team.name]),
  );

  let bestHalf: {
    game: (typeof games)[number];
    inning: number;
    side: "away" | "home";
    runs: number;
  } | null = null;
  let bestFull: {
    game: (typeof games)[number];
    inning: number;
    runs: number;
  } | null = null;

  for (const game of games) {
    if (!game.statsRawJson) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(game.statsRawJson);
    } catch {
      continue;
    }
    const lineScore = parseLineScoreFromEvents(parsed);
    if (!lineScore) continue;

    const halfPeak = findHighestScoringHalfInning(lineScore);
    if (halfPeak && (!bestHalf || halfPeak.runs > bestHalf.runs)) {
      bestHalf = { game, ...halfPeak };
    }

    const fullPeak = findHighestScoringFullInning(lineScore);
    if (fullPeak && (!bestFull || fullPeak.runs > bestFull.runs)) {
      bestFull = { game, ...fullPeak };
    }
  }

  const records: SeasonRecordHolder[] = [];

  if (bestHalf) {
    const awayName = teamNames.get(bestHalf.game.awayTeamId) ?? "Away";
    const homeName = teamNames.get(bestHalf.game.homeTeamId) ?? "Home";
    const teamName = bestHalf.side === "away" ? awayName : homeName;
    const halfLabel = bestHalf.side === "away" ? "top" : "bottom";
    records.push({
      id: `half_inning-${bestHalf.game.id}`,
      category: "half_inning",
      title: "Highest-scoring half-inning",
      value: bestHalf.runs,
      valueLabel: String(bestHalf.runs),
      detail: `${teamName} scored ${bestHalf.runs} in the ${halfLabel} ${bestHalf.inning}${ordinal(bestHalf.inning)}`,
      teamName,
      gameId: bestHalf.game.id,
      leagueId,
      seasonId,
      matchup: `${awayName} ${bestHalf.game.awayScore}–${bestHalf.game.awayScore} ${homeName}`,
      playedAt: bestHalf.game.playedAt,
    });
  }

  if (bestFull) {
    const awayName = teamNames.get(bestFull.game.awayTeamId) ?? "Away";
    const homeName = teamNames.get(bestFull.game.homeTeamId) ?? "Home";
    records.push({
      id: `full_inning-${bestFull.game.id}`,
      category: "full_inning",
      title: "Highest-scoring inning (both teams)",
      value: bestFull.runs,
      valueLabel: String(bestFull.runs),
      detail: `${bestFull.runs} combined runs in the ${bestFull.inning}${ordinal(bestFull.inning)}`,
      gameId: bestFull.game.id,
      leagueId,
      seasonId,
      matchup: `${awayName} ${bestFull.game.awayScore}–${bestFull.game.awayScore} ${homeName}`,
      playedAt: bestFull.game.playedAt,
    });
  }

  return records;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export async function getSeasonRecords(
  seasonId: string,
): Promise<SeasonRecordHolder[]> {
  const season = await loadSeasonContext(seasonId);
  if (!season) return [];

  const records: SeasonRecordHolder[] = [];

  for (const meta of CHARACTER_RECORDS) {
    const record = await topCharacterRecord(
      seasonId,
      season.leagueId,
      meta.field,
      meta,
    );
    if (record) records.push(record);
  }

  const teamRuns = await topTeamScoreRecord(seasonId, season.leagueId);
  if (teamRuns) records.push(teamRuns);

  const shootout = await topShootoutRecord(seasonId, season.leagueId);
  if (shootout) records.push(shootout);

  const blowout = await topBlowoutRecord(seasonId, season.leagueId);
  if (blowout) records.push(blowout);

  records.push(...(await topInningRecords(seasonId, season.leagueId)));

  return records;
}
