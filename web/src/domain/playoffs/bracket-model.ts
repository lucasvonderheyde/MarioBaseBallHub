import type { TeamStandingRow } from "@/domain/standings/compute-standings";
import {
  EIGHT_TEAM_QF_SEEDS,
  type BestOf,
  type PlayoffSettings,
  getDirectQualifyCount,
  playInEnabled,
  winsNeeded,
} from "@/domain/playoffs/playoff-settings";
import type { PlayoffGameView, SeededTeam } from "@/domain/playoffs/build-playoff-picture";
import { resolveSeriesFromGames, type SeriesResult } from "@/domain/playoffs/resolve-series";

export type BracketParticipant = {
  seed: number | null;
  teamId: string | null;
  name: string;
  /** Projected from standings, confirmed from a finished series, or TBD. */
  source: "seed" | "play-in" | "winner" | "tbd";
};

export type BracketSeries = {
  key: string;
  roundIndex: number;
  slotIndex: number;
  label: string;
  bestOf: BestOf;
  top: BracketParticipant;
  bottom: BracketParticipant;
  homeWins: number;
  awayWins: number;
  winnerId: string | null;
  complete: boolean;
  games: PlayoffGameView[];
  /** Play-in only: which QF match slot the winner feeds into. */
  feedsQfSlotIndex?: number;
  /** Play-in only: top or bottom team line in the target QF match. */
  feedsPosition?: "top" | "bottom";
};

export type BracketRound = {
  roundIndex: number;
  label: string;
  series: BracketSeries[];
};

export type BracketPicture = {
  mode: "projected" | "live";
  playIn: BracketSeries[];
  rounds: BracketRound[];
};

function participantFromSeed(
  seed: SeededTeam | undefined,
  source: BracketParticipant["source"],
): BracketParticipant {
  if (!seed) {
    return { seed: null, teamId: null, name: "TBD", source: "tbd" };
  }
  return {
    seed: seed.seed,
    teamId: seed.teamId,
    name: seed.name,
    source,
  };
}

function participantFromWinner(
  winnerId: string | null,
  teamNames: Map<string, string>,
  seedByTeamId: Map<string, number>,
): BracketParticipant {
  if (!winnerId) {
    return { seed: null, teamId: null, name: "TBD", source: "tbd" };
  }
  return {
    seed: seedByTeamId.get(winnerId) ?? null,
    teamId: winnerId,
    name: teamNames.get(winnerId) ?? "?",
    source: "winner",
  };
}

function buildPlayInPairings(seeds: SeededTeam[]): [SeededTeam, SeededTeam][] {
  const playInTeams = seeds.filter((s) => s.status === "play-in");
  const pairs: [SeededTeam, SeededTeam][] = [];
  for (let i = 0; i < Math.floor(playInTeams.length / 2); i++) {
    pairs.push([playInTeams[i]!, playInTeams[playInTeams.length - 1 - i]!]);
  }
  return pairs;
}

function seriesFromGames(
  key: string,
  roundIndex: number,
  slotIndex: number,
  label: string,
  bestOf: BestOf,
  top: BracketParticipant,
  bottom: BracketParticipant,
  games: PlayoffGameView[],
): BracketSeries {
  const resolved = resolveSeriesFromGames(
    games.map((g) => ({
      id: g.id,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      played: g.played,
    })),
    bestOf,
  );
  const series = resolved[0];
  const winnerId = series?.winnerId ?? null;
  const topIsFirst =
    top.teamId && bottom.teamId
      ? top.teamId < bottom.teamId
      : true;

  let homeWins = 0;
  let awayWins = 0;
  if (series) {
    const topWins =
      series.homeTeamId === top.teamId ? series.homeWins : series.awayWins;
    const bottomWins =
      series.homeTeamId === bottom.teamId ? series.homeWins : series.awayWins;
    homeWins = topIsFirst ? topWins : bottomWins;
    awayWins = topIsFirst ? bottomWins : topWins;
  }

  return {
    key,
    roundIndex,
    slotIndex,
    label,
    bestOf,
    top: winnerId === top.teamId ? top : top,
    bottom: winnerId === bottom.teamId ? bottom : bottom,
    homeWins,
    awayWins,
    winnerId,
    complete: winnerId != null,
    games,
  };
}

function roundLabelForIndex(
  roundIndex: number,
  totalRounds: number,
  isFinals: boolean,
): string {
  if (isFinals) return "Finals";
  const fromFinal = totalRounds - 1 - roundIndex;
  if (fromFinal === 0) return "Semifinals";
  if (fromFinal === 1) return "Quarterfinals";
  return `Round ${roundIndex + 1}`;
}

function buildBracketTeamList(
  seeds: SeededTeam[],
  settings: PlayoffSettings,
  playInSeries: BracketSeries[],
): Map<number, BracketParticipant> {
  const bySeed = new Map<number, BracketParticipant>();
  const directCount = getDirectQualifyCount(settings);

  for (const seed of seeds) {
    if (seed.seed <= directCount) {
      bySeed.set(seed.seed, participantFromSeed(seed, "seed"));
    }
  }

  const playInWinners = playInSeries
    .filter((s) => s.complete && s.winnerId)
    .map((s) => s.winnerId!);

  let playInSlot = directCount + 1;
  for (const winnerId of playInWinners) {
    if (playInSlot > settings.mainBracketTeamCount) break;
    const seedRow = seeds.find((s) => s.teamId === winnerId);
    bySeed.set(
      playInSlot,
      participantFromSeed(seedRow, "play-in") ?? {
        seed: playInSlot,
        teamId: winnerId,
        name: seedRow?.name ?? "?",
        source: "play-in",
      },
    );
    playInSlot++;
  }

  if (playInEnabled(settings)) {
    for (let slot = directCount + 1; slot <= settings.mainBracketTeamCount; slot++) {
      if (bySeed.has(slot)) continue;
      bySeed.set(slot, {
        seed: slot,
        teamId: null,
        name: "Play-in",
        source: "play-in",
      });
    }
  }

  for (let s = 1; s <= settings.mainBracketTeamCount; s++) {
    if (!bySeed.has(s)) {
      const row = seeds[s - 1];
      if (row && row.status === "qualified") {
        bySeed.set(s, participantFromSeed(row, "seed"));
      } else {
        bySeed.set(s, { seed: s, teamId: null, name: "TBD", source: "tbd" });
      }
    }
  }

  return bySeed;
}

function qfSlotForSeed(
  seed: number,
  qfPairs: [number, number][],
): { slotIndex: number; position: "top" | "bottom" } | null {
  for (let slotIndex = 0; slotIndex < qfPairs.length; slotIndex++) {
    const [topSeed, bottomSeed] = qfPairs[slotIndex]!;
    if (topSeed === seed) return { slotIndex, position: "top" };
    if (bottomSeed === seed) return { slotIndex, position: "bottom" };
  }
  return null;
}

function withPlayInFeed(
  series: BracketSeries,
  feedsBracketSeed: number,
  qfPairs: [number, number][],
): BracketSeries {
  const feed = qfSlotForSeed(feedsBracketSeed, qfPairs);
  if (!feed) return series;
  return {
    ...series,
    feedsQfSlotIndex: feed.slotIndex,
    feedsPosition: feed.position,
  };
}

function qfPairings(teamCount: number): [number, number][] {
  if (teamCount === 8) return EIGHT_TEAM_QF_SEEDS;
  const pairs: [number, number][] = [];
  for (let i = 0; i < teamCount / 2; i++) {
    pairs.push([i + 1, teamCount - i]);
  }
  return pairs;
}

export function buildBracketPicture(input: {
  seeds: SeededTeam[];
  settings: PlayoffSettings;
  playInGames: PlayoffGameView[];
  mainBracketRounds: { roundNumber: number; games: PlayoffGameView[] }[];
  teamNames: Map<string, string>;
}): BracketPicture {
  const { settings } = input;
  const playIn = playInEnabled(settings);
  const seedByTeamId = new Map(input.seeds.map((s) => [s.teamId, s.seed]));

  const playInPairings = buildPlayInPairings(input.seeds);
  const teamCount = settings.mainBracketTeamCount;
  const qfPairs = qfPairings(teamCount);
  const directCount = getDirectQualifyCount(settings);

  const playInSeries: BracketSeries[] = playInPairings.map(([top, bottom], index) => {
    const pairGames = input.playInGames.filter(
      (g) =>
        (g.homeTeamId === top.teamId && g.awayTeamId === bottom.teamId) ||
        (g.homeTeamId === bottom.teamId && g.awayTeamId === top.teamId),
    );
    const feedsBracketSeed = directCount + 1 + index;
    const base = seriesFromGames(
      `pi-${index}`,
      -1,
      index,
      `Play-in ${index + 1}`,
      settings.playInBestOf,
      participantFromSeed(top, "play-in"),
      participantFromSeed(bottom, "play-in"),
      pairGames,
    );
    return withPlayInFeed(base, feedsBracketSeed, qfPairs);
  });

  const bracketTeams = buildBracketTeamList(input.seeds, settings, playInSeries);
  const roundCount = Math.log2(teamCount);
  if (!Number.isInteger(roundCount) || roundCount < 1) {
    return { mode: "projected", playIn: playInSeries, rounds: [] };
  }

  const sortedMainRounds = [...input.mainBracketRounds].sort(
    (a, b) => a.roundNumber - b.roundNumber,
  );

  const rounds: BracketRound[] = [];
  let prevWinners: (BracketParticipant | null)[] = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex++) {
    const isFinals = roundIndex === roundCount - 1;
    const bestOf = isFinals ? settings.finalsBestOf : settings.mainRoundBestOf;
    const matchCount = teamCount / Math.pow(2, roundIndex + 1);
    const scheduleRound = sortedMainRounds[roundIndex];
    const seriesList: BracketSeries[] = [];

    for (let slot = 0; slot < matchCount; slot++) {
      let top: BracketParticipant;
      let bottom: BracketParticipant;

      if (roundIndex === 0) {
        const [seedA, seedB] = qfPairs[slot]!;
        top = bracketTeams.get(seedA) ?? participantFromSeed(undefined, "tbd");
        bottom = bracketTeams.get(seedB) ?? participantFromSeed(undefined, "tbd");
      } else {
        top = prevWinners[slot * 2] ?? { seed: null, teamId: null, name: "TBD", source: "tbd" };
        bottom =
          prevWinners[slot * 2 + 1] ?? {
            seed: null,
            teamId: null,
            name: "TBD",
            source: "tbd",
          };
      }

      const roundGames = scheduleRound?.games ?? [];
      const slotGames = roundGames.filter((g) => g.slotInRound === slot + 1);
      const allPairGames =
        slotGames.length > 0
          ? slotGames
          : roundGames.filter(
              (g) =>
                top.teamId &&
                bottom.teamId &&
                ((g.homeTeamId === top.teamId && g.awayTeamId === bottom.teamId) ||
                  (g.homeTeamId === bottom.teamId && g.awayTeamId === top.teamId)),
            );

      seriesList.push(
        seriesFromGames(
          `r${roundIndex}-s${slot}`,
          roundIndex,
          slot,
          roundLabelForIndex(roundIndex, roundCount, isFinals),
          bestOf,
          top,
          bottom,
          allPairGames,
        ),
      );
    }

    prevWinners = seriesList.map((s) =>
      s.complete && s.winnerId
        ? participantFromWinner(s.winnerId, input.teamNames, seedByTeamId)
        : null,
    );

    rounds.push({
      roundIndex,
      label: roundLabelForIndex(roundIndex, roundCount, isFinals),
      series: seriesList,
    });
  }

  const hasPlayedPlayoffGame =
    input.playInGames.some((g) => g.played) ||
    input.mainBracketRounds.some((r) => r.games.some((g) => g.played));

  const mode: BracketPicture["mode"] = hasPlayedPlayoffGame ? "live" : "projected";

  return { mode, playIn: playInSeries, rounds };
}

export function enrichGamesWithSeries(
  games: PlayoffGameView[],
  bestOf: BestOf,
): (PlayoffGameView & { bestOf: BestOf; seriesGameNumber: number; seriesWins: string })[] {
  const resolved = resolveSeriesFromGames(
    games.map((g) => ({
      id: g.id,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      played: g.played,
    })),
    bestOf,
  );

  return games.map((game, index) => {
    const series = resolved.find((s) => s.games.some((g) => g.id === game.id));
    const seriesGameNumber = (series?.games.findIndex((g) => g.id === game.id) ?? index) + 1;
    const winsLabel = series
      ? `${series.homeWins}–${series.awayWins} (BO${bestOf})`
      : `BO${bestOf}`;
    return { ...game, bestOf, seriesGameNumber, seriesWins: winsLabel };
  });
}

export { winsNeeded, type SeriesResult };
