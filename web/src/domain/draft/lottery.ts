export type LotteryEntry = {
  teamId: string;
  /** Number of lottery balls — higher means better odds at the top pick. */
  weight: number;
};

/**
 * NBA-style descending weights: the worst-ranked team gets the most balls.
 * `ranking` is best-to-worst (final standings order).
 */
export function lotteryWeightsFromStandings(
  rankingBestToWorst: string[],
): LotteryEntry[] {
  // Best team gets 1 ball, each rank below adds one more.
  return rankingBestToWorst.map((teamId, index) => ({
    teamId,
    weight: index + 1,
  }));
}

/** Deterministic PRNG (mulberry32) so a lottery can be replayed from its seed. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws the full draft order by weighted sampling without replacement:
 * each slot is drawn from the remaining teams proportionally to weight.
 */
export function runDraftLottery(entries: LotteryEntry[], seed: number): string[] {
  const random = createRandom(seed);
  const remaining = entries.map((entry) => ({
    teamId: entry.teamId,
    weight: Math.max(1, entry.weight),
  }));
  const order: string[] = [];

  while (remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, entry) => sum + entry.weight, 0);
    let ball = random() * totalWeight;
    let pickedIndex = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      ball -= remaining[i]!.weight;
      if (ball <= 0) {
        pickedIndex = i;
        break;
      }
    }
    order.push(remaining[pickedIndex]!.teamId);
    remaining.splice(pickedIndex, 1);
  }

  return order;
}
