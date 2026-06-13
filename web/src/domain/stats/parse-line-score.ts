export type InningLineScore = {
  inningNumbers: number[];
  awayRunsByInning: number[];
  homeRunsByInning: number[];
  awayTotal: number;
  homeTotal: number;
};

function readScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Builds a runs-by-inning line score from MSSB decoded JSON Events. */
export function parseLineScoreFromEvents(data: unknown): InningLineScore | null {
  if (typeof data !== "object" || data == null) return null;
  const events = (data as Record<string, unknown>)["Events"];
  if (!Array.isArray(events) || events.length === 0) return null;

  const endScoreByInning = new Map<number, { away: number; home: number }>();

  for (const event of events) {
    if (typeof event !== "object" || event == null) continue;
    const row = event as Record<string, unknown>;
    const inning = readScore(row["Inning"]);
    const away = readScore(row["Away Score"]);
    const home = readScore(row["Home Score"]);
    if (inning == null || away == null || home == null || inning < 1) continue;

    endScoreByInning.set(inning, { away, home });
  }

  if (endScoreByInning.size === 0) return null;

  const maxInning = Math.max(...endScoreByInning.keys());
  const awayRunsByInning: number[] = [];
  const homeRunsByInning: number[] = [];
  let previous = { away: 0, home: 0 };

  for (let inning = 1; inning <= maxInning; inning++) {
    const end = endScoreByInning.get(inning) ?? previous;
    awayRunsByInning.push(end.away - previous.away);
    homeRunsByInning.push(end.home - previous.home);
    previous = end;
  }

  const inningNumbers = Array.from({ length: maxInning }, (_, i) => i + 1);
  const awayTotal = awayRunsByInning.reduce((sum, runs) => sum + runs, 0);
  const homeTotal = homeRunsByInning.reduce((sum, runs) => sum + runs, 0);

  return {
    inningNumbers,
    awayRunsByInning,
    homeRunsByInning,
    awayTotal,
    homeTotal,
  };
}

/**
 * Maps JSON away/home line score rows onto schedule away/home when upload reversed sides.
 */
export function alignLineScoreToSchedule(
  lineScore: InningLineScore,
  scheduleAwayScore: number,
  scheduleHomeScore: number,
): InningLineScore {
  if (
    lineScore.awayTotal === scheduleAwayScore &&
    lineScore.homeTotal === scheduleHomeScore
  ) {
    return lineScore;
  }

  if (
    lineScore.awayTotal === scheduleHomeScore &&
    lineScore.homeTotal === scheduleAwayScore
  ) {
    return {
      ...lineScore,
      awayRunsByInning: lineScore.homeRunsByInning,
      homeRunsByInning: lineScore.awayRunsByInning,
      awayTotal: lineScore.homeTotal,
      homeTotal: lineScore.awayTotal,
    };
  }

  return lineScore;
}

export type HalfInningScoringPeak = {
  inning: number;
  side: "away" | "home";
  runs: number;
};

export type FullInningScoringPeak = {
  inning: number;
  runs: number;
};

export function findHighestScoringHalfInning(
  lineScore: InningLineScore,
): HalfInningScoringPeak | null {
  let best: HalfInningScoringPeak | null = null;

  lineScore.awayRunsByInning.forEach((runs, index) => {
    if (runs <= 0) return;
    const peak = { inning: index + 1, side: "away" as const, runs };
    if (!best || runs > best.runs) best = peak;
  });

  lineScore.homeRunsByInning.forEach((runs, index) => {
    if (runs <= 0) return;
    const peak = { inning: index + 1, side: "home" as const, runs };
    if (!best || runs > best.runs) best = peak;
  });

  return best;
}

/** Plain-text line score for AI briefs and logs. */
export function formatLineScoreForBrief(
  lineScore: InningLineScore,
  awayLabel: string,
  homeLabel: string,
): string {
  const innings = lineScore.inningNumbers.join(" ");
  const awayLine = lineScore.awayRunsByInning.join(" ");
  const homeLine = lineScore.homeRunsByInning.join(" ");
  return [
    `       ${innings}`,
    `${awayLabel.padEnd(6)} ${awayLine} — ${lineScore.awayTotal}`,
    `${homeLabel.padEnd(6)} ${homeLine} — ${lineScore.homeTotal}`,
  ].join("\n");
}

export function findHighestScoringFullInning(
  lineScore: InningLineScore,
): FullInningScoringPeak | null {
  let best: FullInningScoringPeak | null = null;

  for (let index = 0; index < lineScore.inningNumbers.length; index++) {
    const runs =
      (lineScore.awayRunsByInning[index] ?? 0) +
      (lineScore.homeRunsByInning[index] ?? 0);
    if (runs <= 0) continue;
    const peak = { inning: index + 1, runs };
    if (!best || runs > best.runs) best = peak;
  }

  return best;
}
