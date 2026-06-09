export type SeasonStatus = "setup" | "active" | "completed";

const STATUS_ORDER: Record<SeasonStatus, number> = {
  active: 0,
  setup: 1,
  completed: 2,
};

/** Active season first, then setup, then completed; newest within each group. */
export function sortSeasonsForDisplay<T extends { status: SeasonStatus; createdAt: Date }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export function pickDefaultSeasonId<T extends { id: string; status: SeasonStatus }>(
  rows: T[],
): string | null {
  if (rows.length === 0) return null;
  const active = rows.find((s) => s.status === "active");
  if (active) return active.id;
  return rows[0]!.id;
}
