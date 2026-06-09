type RoundPhase = "regular" | "playoffs";

export function scheduleRoundHeading(
  phase: RoundPhase,
  roundNumber: number,
): string {
  if (phase === "playoffs") {
    return `Playoffs · Round ${roundNumber}`;
  }
  return `Week ${roundNumber}`;
}

export function scheduleRoundShortLabel(
  phase: RoundPhase,
  roundNumber: number,
): string {
  if (phase === "playoffs") {
    return `PO R${roundNumber}`;
  }
  return `W${roundNumber}`;
}
