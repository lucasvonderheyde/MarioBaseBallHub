export type BattingTotals = {
  games: number;
  ab: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  hr: number;
  walks4ball: number;
  walksHbp: number;
  sacFly: number;
  rbi: number;
};

export function battingAverage(t: Pick<BattingTotals, "hits" | "ab">): number | null {
  if (t.ab === 0) return null;
  return t.hits / t.ab;
}

export function onBasePercentage(
  t: Pick<BattingTotals, "hits" | "ab" | "walks4ball" | "walksHbp" | "sacFly">,
): number | null {
  const pa = t.ab + t.walks4ball + t.walksHbp + t.sacFly;
  if (pa === 0) return null;
  return (t.hits + t.walks4ball + t.walksHbp) / pa;
}

export function sluggingPercentage(
  t: Pick<BattingTotals, "ab" | "singles" | "doubles" | "triples" | "hr">,
): number | null {
  if (t.ab === 0) return null;
  const tb = t.singles + 2 * t.doubles + 3 * t.triples + 4 * t.hr;
  return tb / t.ab;
}

/** e.g. 0.312 → ".312", null → "—" */
export function formatRate(rate: number | null, decimals = 3): string {
  if (rate == null) return "—";
  const s = rate.toFixed(decimals);
  return s.startsWith("0.") ? s.slice(1) : s;
}

export function sumBattingTotals(rows: BattingTotals[]): BattingTotals {
  return rows.reduce(
    (acc, r) => ({
      games: acc.games + r.games,
      ab: acc.ab + r.ab,
      hits: acc.hits + r.hits,
      singles: acc.singles + r.singles,
      doubles: acc.doubles + r.doubles,
      triples: acc.triples + r.triples,
      hr: acc.hr + r.hr,
      walks4ball: acc.walks4ball + r.walks4ball,
      walksHbp: acc.walksHbp + r.walksHbp,
      sacFly: acc.sacFly + r.sacFly,
      rbi: acc.rbi + r.rbi,
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
}

export function inningsPitched(outsPitched: number): string {
  const full = Math.floor(outsPitched / 3);
  const partial = outsPitched % 3;
  return `${full}.${partial}`;
}
