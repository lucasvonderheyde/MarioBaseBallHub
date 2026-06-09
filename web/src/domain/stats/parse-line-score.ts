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

  const startScoreByHalf = new Map<string, { away: number; home: number }>();
  const endScoreByHalf = new Map<string, { away: number; home: number }>();

  for (const event of events) {
    if (typeof event !== "object" || event == null) continue;
    const row = event as Record<string, unknown>;
    const inning = readScore(row["Inning"]);
    const half = readScore(row["Half Inning"]);
    const away = readScore(row["Away Score"]);
    const home = readScore(row["Home Score"]);
    if (inning == null || half == null || away == null || home == null) continue;

    const key = `${inning}:${half}`;
    if (!startScoreByHalf.has(key)) {
      startScoreByHalf.set(key, { away, home });
    }
    endScoreByHalf.set(key, { away, home });
  }

  if (endScoreByHalf.size === 0) return null;

  const maxInning = Math.max(
    ...[...endScoreByHalf.keys()].map((key) => Number(key.split(":")[0])),
  );
  const awayRunsByInning = Array.from({ length: maxInning }, () => 0);
  const homeRunsByInning = Array.from({ length: maxInning }, () => 0);

  for (const [key, end] of endScoreByHalf) {
    const [inningStr, halfStr] = key.split(":");
    const inning = Number(inningStr);
    const half = Number(halfStr);
    const start = startScoreByHalf.get(key);
    if (!start || !Number.isFinite(inning) || inning < 1) continue;

    const idx = inning - 1;
    if (half === 0) {
      awayRunsByInning[idx] = end.away - start.away;
    } else if (half === 1) {
      homeRunsByInning[idx] = end.home - start.home;
    }
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
