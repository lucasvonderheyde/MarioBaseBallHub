import {
  battingAverage,
  onBasePercentage,
  sluggingPercentage,
  sumBattingTotals,
  type BattingTotals,
} from "@/domain/stats/batting-metrics";
import { type BattingLine, battingStatKey, type PitchingLine, pitchingStatKey } from "@/lib/game-stats-queries";

function withRates(charId: string, charOccurrenceIndex: number, totals: BattingTotals): BattingLine {
  return {
    charId,
    charOccurrenceIndex,
    ...totals,
    ba: battingAverage(totals),
    obp: onBasePercentage(totals),
    slg: sluggingPercentage(totals),
  };
}

/** Resolves season batting for a roster copy, falling back when occurrence keys do not line up. */
export function resolveBattingLineForRosterCopy(
  charId: string,
  copyIndex: number,
  copyCount: number,
  byOccurrence: Map<string, BattingLine>,
  byCharId: Map<string, BattingLine>,
): BattingLine | undefined {
  const occurrenceIndex = copyIndex - 1;
  const direct = byOccurrence.get(battingStatKey(charId, occurrenceIndex));
  if (direct) return direct;

  const occurrenceLines = [...byOccurrence.entries()]
    .filter(([key]) => key.startsWith(`${charId}\0`))
    .map(([, line]) => line);

  if (occurrenceLines.length === 1) {
    return occurrenceLines[0];
  }

  if (copyCount === 1) {
    return byCharId.get(charId);
  }

  if (occurrenceLines.length > 1) {
    return withRates(charId, occurrenceIndex, sumBattingTotals(occurrenceLines));
  }

  return byCharId.get(charId);
}

function sumPitchingTotals(lines: PitchingLine[]): Omit<PitchingLine, "charId" | "charOccurrenceIndex"> {
  return lines.reduce(
    (acc, line) => ({
      games: acc.games + line.games,
      gamesStarted: acc.gamesStarted + line.gamesStarted,
      reliefAppearances: acc.reliefAppearances + line.reliefAppearances,
      outsPitched: acc.outsPitched + line.outsPitched,
      battersFaced: acc.battersFaced + line.battersFaced,
      hitsAllowed: acc.hitsAllowed + line.hitsAllowed,
      runsAllowed: acc.runsAllowed + line.runsAllowed,
      earnedRuns: acc.earnedRuns + line.earnedRuns,
      walks: acc.walks + line.walks,
      strikeouts: acc.strikeouts + line.strikeouts,
      hrAllowed: acc.hrAllowed + line.hrAllowed,
      pitchesThrown: acc.pitchesThrown + line.pitchesThrown,
    }),
    {
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
    },
  );
}

/** Resolves season pitching for a roster copy, falling back when occurrence keys do not line up. */
export function resolvePitchingLineForRosterCopy(
  charId: string,
  copyIndex: number,
  copyCount: number,
  byOccurrence: Map<string, PitchingLine>,
  byCharId: Map<string, PitchingLine>,
): PitchingLine | undefined {
  const occurrenceIndex = copyIndex - 1;
  const direct = byOccurrence.get(pitchingStatKey(charId, occurrenceIndex));
  if (direct) return direct;

  const occurrenceLines = [...byOccurrence.entries()]
    .filter(([key]) => key.startsWith(`${charId}\0`))
    .map(([, line]) => line);

  if (occurrenceLines.length === 1) {
    return occurrenceLines[0];
  }

  if (copyCount === 1) {
    return byCharId.get(charId);
  }

  if (occurrenceLines.length > 1) {
    return { charId, charOccurrenceIndex: occurrenceIndex, ...sumPitchingTotals(occurrenceLines) };
  }

  return byCharId.get(charId);
}

export function currentRosterCharIds(
  roster: { gameCharId: string }[],
): Set<string> {
  return new Set(roster.map((row) => row.gameCharId));
}
