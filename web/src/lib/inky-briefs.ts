import {
  findSeriesMatchup,
  listPlayoffSeriesMatchups,
  type PlayoffSeriesMatchup,
} from "@/domain/inky/series-matchups";
import {
  alignLineScoreToSchedule,
  formatLineScoreForBrief,
  parseLineScoreFromEvents,
} from "@/domain/stats/parse-line-score";
import { parseCharacterGameStats } from "@/domain/stats/parse-character-game-stats";
import { resolveGameFieldSides } from "@/domain/stats/resolve-game-field-sides";
import { normalizeStadiumId } from "@/domain/stats/stadium-id";
import { formatCharIdDisplay } from "@/lib/character-display";
import { getGameCharacterStats } from "@/lib/game-stats-queries";
import { getRecentSeasonEvents } from "@/lib/season-events";
import { getSeasonRecords } from "@/lib/season-records";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { getSeasonDraftView } from "@/lib/season-draft";
import { managerDisplayName } from "@/lib/manager-profile";
import {
  earnedRunAverage,
  formatEra,
  inningsPitched,
} from "@/domain/stats/batting-metrics";

function managerBriefLabel(
  manager: { username: string; displayName: string | null } | null | undefined,
  teamName: string,
): string {
  if (!manager) return teamName;
  const name = managerDisplayName(manager);
  const lower = name.toLowerCase();
  if (lower.includes("ryan")) return `${name} ("The Dealmaker") — ${teamName}`;
  if (lower.includes("andre")) return `${name} ("The Field Marshal") — ${teamName}`;
  if (lower.includes("mikey")) return `${name} ("The Hammer") — ${teamName}`;
  if (lower.includes("lucas")) return `${name} (defending champion) — ${teamName}`;
  return `${name} — ${teamName}`;
}

function topHitters(
  stats: Awaited<ReturnType<typeof getGameCharacterStats>>,
  limit = 3,
): string[] {
  return [...stats]
    .filter((row) => row.ab > 0)
    .sort((a, b) => b.hits + b.hr * 2 + b.rbi - (a.hits + a.hr * 2 + a.rbi))
    .slice(0, limit)
    .map(
      (row) =>
        `${formatCharIdDisplay(row.charId)}: ${row.hits}-${row.ab}, ${row.rbi} RBI` +
        (row.hr > 0 ? `, ${row.hr} HR` : ""),
    );
}

function pitchingLines(
  stats: Awaited<ReturnType<typeof getGameCharacterStats>>,
): string[] {
  return stats
    .filter(
      (row) =>
        row.pitchingRole === "starter" ||
        row.pitchingRole === "reliever" ||
        row.outsPitched > 0,
    )
    .sort((a, b) => {
      if (a.pitchingRole === "starter" && b.pitchingRole !== "starter") return -1;
      if (b.pitchingRole === "starter" && a.pitchingRole !== "starter") return 1;
      return b.outsPitched - a.outsPitched;
    })
    .map((row) => {
      const role = row.pitchingRole === "starter" ? "SP" : "RP";
      const era = formatEra(earnedRunAverage(row.earnedRuns, row.outsPitched));
      return (
        `${role} ${formatCharIdDisplay(row.charId)}: ${inningsPitched(row.outsPitched)} IP, ` +
        `${row.strikeoutsDef} K, ${row.earnedRuns} ER (${era} ERA), ${row.hitsAllowed} H allowed`
      );
    });
}

export async function buildGameBrief(
  seasonId: string,
  gameId: string,
): Promise<string | null> {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash) return null;

  const entry = dash.games.find((g) => g.game.id === gameId);
  if (!entry) return null;

  const { game, round } = entry;
  if (game.homeScore == null || game.awayScore == null || !game.statsRawJson) {
    return null;
  }

  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));
  const managers = new Map(
    dash.teams.map((t) => [t.team.id, t.manager ?? null]),
  );

  const fieldSides = resolveGameFieldSides(game);
  const awayTeamId = fieldSides.awayTeamId;
  const homeTeamId = fieldSides.homeTeamId;
  const awayName = teamNames.get(awayTeamId) ?? "Away";
  const homeName = teamNames.get(homeTeamId) ?? "Home";

  const stats = await getGameCharacterStats(gameId);
  const parsed = parseCharacterGameStats(JSON.parse(game.statsRawJson));
  const rawLine = parseLineScoreFromEvents(JSON.parse(game.statsRawJson));
  const lineScore = rawLine
    ? alignLineScoreToSchedule(rawLine, game.awayScore, game.homeScore)
    : null;

  const stadium = normalizeStadiumId(game.statsStadiumId ?? parsed.stadiumId);
  const awayStats = stats.filter((r) => r.teamId === awayTeamId);
  const homeStats = stats.filter((r) => r.teamId === homeTeamId);

  const lines: string[] = [];
  lines.push(`League: ${dash.league.name}`);
  lines.push(`Season: ${dash.season.name}`);
  lines.push(
    `Round: ${round.phase === "playoffs" ? `Playoffs round ${round.roundNumber}` : `Week ${round.roundNumber}`}`,
  );
  lines.push(`Stadium: ${stadium ?? "Unknown"}`);
  lines.push("");
  lines.push(`Final: ${awayName} ${game.awayScore} @ ${homeName} ${game.homeScore}`);
  lines.push(
    `Managers: ${managerBriefLabel(managers.get(awayTeamId), awayName)} vs ${managerBriefLabel(managers.get(homeTeamId), homeName)}`,
  );
  if (lineScore) {
    lines.push(`Line score:\n${formatLineScoreForBrief(lineScore, awayName, homeName)}`);
  }
  lines.push(
    `Team hits: ${awayName} ${awayStats.reduce((s, r) => s + r.hits, 0)}, ${homeName} ${homeStats.reduce((s, r) => s + r.hits, 0)}`,
  );

  const awayPitch = pitchingLines(awayStats);
  const homePitch = pitchingLines(homeStats);
  if (awayPitch.length) {
    lines.push(`\n${awayName} pitching:\n${awayPitch.map((l) => `- ${l}`).join("\n")}`);
  }
  if (homePitch.length) {
    lines.push(`\n${homeName} pitching:\n${homePitch.map((l) => `- ${l}`).join("\n")}`);
  }

  lines.push(
    `\n${awayName} top hitters:\n${topHitters(awayStats).map((l) => `- ${l}`).join("\n") || "- (none)"}`,
  );
  lines.push(
    `\n${homeName} top hitters:\n${topHitters(homeStats).map((l) => `- ${l}`).join("\n") || "- (none)"}`,
  );

  lines.push("\nStandings snapshot (W-L, RF-RA):");
  dash.standings.slice(0, 8).forEach((row, i) => {
    lines.push(
      `${i + 1}. ${row.name} ${row.wins}-${row.losses} (${row.runsFor}-${row.runsAgainst})`,
    );
  });

  return lines.join("\n");
}

export async function buildWeeklyBrief(
  seasonId: string,
  weekNumber?: number,
): Promise<{ brief: string; weekNumber: number } | null> {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash) return null;

  const regularGames = dash.games.filter((g) => g.round.phase === "regular");
  const weeks = [...new Set(regularGames.map((g) => g.round.roundNumber))].sort(
    (a, b) => a - b,
  );

  let targetWeek = weekNumber;
  if (targetWeek == null) {
    const playedWeeks = regularGames
      .filter(
        (g) =>
          g.game.statsRawJson &&
          g.game.homeScore != null &&
          g.game.awayScore != null,
      )
      .map((g) => g.round.roundNumber);
    targetWeek =
      playedWeeks.length > 0 ? Math.max(...playedWeeks) : weeks[weeks.length - 1];
  }
  if (targetWeek == null) return null;

  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));
  const weekGames = regularGames.filter((g) => g.round.roundNumber === targetWeek);
  const played = weekGames.filter(
    (g) => g.game.statsRawJson && g.game.homeScore != null && g.game.awayScore != null,
  );

  const lines: string[] = [];
  lines.push(`League: ${dash.league.name}`);
  lines.push(`Season: ${dash.season.name}`);
  lines.push(`Week ${targetWeek} column`);

  lines.push("\nStandings entering / after this week:");
  dash.standings.forEach((row, i) => {
    lines.push(
      `${i + 1}. ${row.name} ${row.wins}-${row.losses} (RF ${row.runsFor}, RA ${row.runsAgainst})`,
    );
  });

  if (played.length > 0) {
    lines.push(`\nWeek ${targetWeek} results:`);
    for (const { game } of played) {
      const away = teamNames.get(game.awayTeamId) ?? "?";
      const home = teamNames.get(game.homeTeamId) ?? "?";
      lines.push(`- ${away} ${game.awayScore} @ ${home} ${game.homeScore}`);
    }
  } else {
    lines.push("\nNo completed games this week yet.");
  }

  const events = await getRecentSeasonEvents(seasonId, 10);
  if (events.length) {
    lines.push("\nRecent league activity:");
    for (const event of events.slice(0, 8)) {
      lines.push(`- ${event.message}`);
    }
  }

  return { brief: lines.join("\n"), weekNumber: targetWeek };
}

export async function buildPreviewBrief(
  seasonId: string,
  gameId: string,
): Promise<string | null> {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash) return null;

  const entry = dash.games.find((g) => g.game.id === gameId);
  if (!entry) return null;

  const { game, round } = entry;
  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));
  const managers = new Map(dash.teams.map((t) => [t.team.id, t.manager ?? null]));

  const awayName = teamNames.get(game.awayTeamId) ?? "Away";
  const homeName = teamNames.get(game.homeTeamId) ?? "Home";

  const lines: string[] = [];
  lines.push(`League: ${dash.league.name}`);
  lines.push(`Season: ${dash.season.name}`);
  lines.push(
    `Upcoming ${round.phase === "playoffs" ? "playoff" : "regular season"} matchup`,
  );
  lines.push(`${awayName} @ ${homeName}`);
  lines.push(
    `Managers: ${managerBriefLabel(managers.get(game.awayTeamId), awayName)} vs ${managerBriefLabel(managers.get(game.homeTeamId), homeName)}`,
  );

  lines.push("\nStandings:");
  dash.standings.forEach((row, i) => {
    lines.push(`${i + 1}. ${row.name} ${row.wins}-${row.losses}`);
  });

  const h2h = dash.games.filter(
    (g) =>
      g.game.statsRawJson &&
      ((g.game.awayTeamId === game.awayTeamId &&
        g.game.homeTeamId === game.homeTeamId) ||
        (g.game.awayTeamId === game.homeTeamId &&
          g.game.homeTeamId === game.awayTeamId)),
  );
  if (h2h.length > 0) {
    lines.push("\nHead-to-head this season (completed):");
    for (const { game: prior } of h2h) {
      if (prior.id === game.id) continue;
      if (prior.homeScore == null || prior.awayScore == null) continue;
      const a = teamNames.get(prior.awayTeamId) ?? "?";
      const h = teamNames.get(prior.homeTeamId) ?? "?";
      lines.push(`- ${a} ${prior.awayScore} @ ${h} ${prior.homeScore}`);
    }
  }

  const records = await getSeasonRecords(seasonId);
  if (records.length) {
    lines.push("\nNotable season records:");
    for (const record of records.slice(0, 5)) {
      lines.push(`- ${record.title}: ${record.detail}`);
    }
  }

  return lines.join("\n");
}

function formatSeriesGameBrief(
  matchup: PlayoffSeriesMatchup,
  teamNames: Map<string, string>,
): string[] {
  const lines: string[] = [];
  const teamA = teamNames.get(matchup.awayTeamId) ?? "Team A";
  const teamB = teamNames.get(matchup.homeTeamId) ?? "Team B";

  lines.push(
    `Series: ${teamA} vs ${teamB} (${matchup.phase === "playoffs" ? "Playoffs" : "Regular"} round ${matchup.roundNumber})`,
  );
  lines.push(`Games in series: ${matchup.playedCount} of ${matchup.totalCount} complete`);

  let winsA = 0;
  let winsB = 0;

  for (const [index, { game }] of matchup.games.entries()) {
    if (game.homeScore == null || game.awayScore == null) {
      lines.push(`Game ${index + 1}: not yet played`);
      continue;
    }
    const away = teamNames.get(game.awayTeamId) ?? "?";
    const home = teamNames.get(game.homeTeamId) ?? "?";
    lines.push(`Game ${index + 1}: ${away} ${game.awayScore} @ ${home} ${game.homeScore}`);

    if (game.awayScore > game.homeScore) {
      if (game.awayTeamId === matchup.awayTeamId) winsA++;
      else if (game.awayTeamId === matchup.homeTeamId) winsB++;
    } else if (game.homeScore > game.awayScore) {
      if (game.homeTeamId === matchup.awayTeamId) winsA++;
      else if (game.homeTeamId === matchup.homeTeamId) winsB++;
    }
  }

  lines.push(`Series record (${teamA}-${teamB}): ${winsA}-${winsB}`);
  return lines;
}

export async function buildSeriesBrief(
  seasonId: string,
  seriesKey: string,
): Promise<string | null> {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash) return null;

  const matchup = findSeriesMatchup(dash.games, seriesKey);
  if (!matchup || matchup.playedCount === 0) return null;

  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));
  const lines: string[] = [];
  lines.push(`League: ${dash.league.name}`);
  lines.push(`Season: ${dash.season.name}`);
  lines.push(...formatSeriesGameBrief(matchup, teamNames));

  return lines.join("\n");
}

export async function buildDraftBrief(
  seasonId: string,
  variant: "lottery" | "complete",
): Promise<string | null> {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash) return null;

  const draft = await getSeasonDraftView(seasonId);
  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));

  const lines: string[] = [];
  lines.push(`League: ${dash.league.name}`);
  lines.push(`Season: ${dash.season.name}`);
  lines.push(`Draft status: ${draft.status}`);

  if (variant === "lottery" || draft.picks.length === 0) {
    if (draft.teamOrder.length) {
      lines.push("\nDraft order (lottery / pick order):");
      draft.teamOrder.forEach((teamId, index) => {
        lines.push(`${index + 1}. ${teamNames.get(teamId) ?? "Team"}`);
      });
    }
  }

  if (variant === "complete" && draft.picks.length > 0) {
    lines.push("\nDraft picks (most recent first):");
    const recent = [...draft.picks]
      .sort((a, b) => b.pickNumber - a.pickNumber)
      .slice(0, 24);
    for (const pick of recent.reverse()) {
      lines.push(
        `Pick ${pick.pickNumber}: ${teamNames.get(pick.teamId) ?? "Team"} — ${pick.displayName}`,
      );
    }
  }

  const events = await getRecentSeasonEvents(seasonId, 5);
  const draftEvents = events.filter((e) => e.eventType.includes("draft"));
  if (draftEvents.length) {
    lines.push("\nDraft activity log:");
    for (const event of draftEvents) {
      lines.push(`- ${event.message}`);
    }
  }

  return lines.join("\n");
}

export async function buildSeasonBrief(seasonId: string): Promise<string | null> {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash) return null;

  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));
  const lines: string[] = [];

  lines.push(`League: ${dash.league.name}`);
  lines.push(`Season: ${dash.season.name} (status: ${dash.season.status})`);

  lines.push("\nStandings (W-L, runs for/against):");
  dash.standings.forEach((row, index) => {
    lines.push(
      `${index + 1}. ${row.name} ${row.wins}-${row.losses} (RF ${row.runsFor}, RA ${row.runsAgainst})`,
    );
  });

  const recentGames = dash.games
    .filter(
      ({ game }) =>
        game.playedAt != null && game.homeScore != null && game.awayScore != null,
    )
    .sort(
      (a, b) => (b.game.playedAt?.getTime() ?? 0) - (a.game.playedAt?.getTime() ?? 0),
    )
    .slice(0, 10);

  if (recentGames.length > 0) {
    lines.push("\nRecent results (most recent first):");
    for (const { game, round } of recentGames) {
      lines.push(
        `${round.phase === "playoffs" ? "Playoffs" : `Week ${round.roundNumber}`}: ` +
          `${teamNames.get(game.awayTeamId) ?? "?"} ${game.awayScore} @ ` +
          `${teamNames.get(game.homeTeamId) ?? "?"} ${game.homeScore}`,
      );
    }
  }

  const records = await getSeasonRecords(seasonId);
  if (records.length > 0) {
    lines.push("\nSeason records:");
    for (const record of records.slice(0, 8)) {
      lines.push(`${record.title}: ${record.valueLabel} — ${record.detail}`);
    }
  }

  const events = await getRecentSeasonEvents(seasonId, 15);
  if (events.length > 0) {
    lines.push("\nRecent league activity:");
    for (const event of events) {
      lines.push(`- ${event.message}`);
    }
  }

  return lines.join("\n");
}

export async function listSeriesOptions(seasonId: string) {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash) return [];

  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));

  return listPlayoffSeriesMatchups(dash.games)
    .filter((m) => m.playedCount > 0)
    .map((m) => ({
      seriesKey: m.seriesKey,
      label: `${teamNames.get(m.awayTeamId) ?? "?"} vs ${teamNames.get(m.homeTeamId) ?? "?"} (${m.playedCount}/${m.totalCount} games${m.isComplete ? ", complete" : ""})`,
      isComplete: m.isComplete,
    }));
}

export async function findCompletedSeriesForGame(
  seasonId: string,
  gameId: string,
): Promise<PlayoffSeriesMatchup | null> {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash) return null;

  const entry = dash.games.find((g) => g.game.id === gameId);
  if (!entry) return null;

  const { game, round } = entry;
  const key = `${round.id}:${[game.awayTeamId, game.homeTeamId].sort().join(":")}`;
  const matchup = findSeriesMatchup(dash.games, key);
  if (!matchup?.isComplete) return null;
  return matchup;
}
