export type NetplayUserLike = {
  username: string;
  displayName?: string | null;
  netplayUsername?: string | null;
};

export function normalizeNetplayLabel(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Labels used to match decoded stats "Home Player" / "Away Player" fields. */
export function managerNetplayLabels(user: NetplayUserLike | null | undefined): string[] {
  if (!user) return [];
  const labels = new Set<string>();
  for (const candidate of [user.netplayUsername, user.username, user.displayName]) {
    const normalized = normalizeNetplayLabel(candidate);
    if (normalized) labels.add(normalized);
  }
  return [...labels];
}

export function netplayLabelMatches(
  managerLabels: string[],
  fileLabel: string | null | undefined,
): boolean {
  const normalized = normalizeNetplayLabel(fileLabel);
  if (!normalized) return false;
  return managerLabels.includes(normalized);
}

export function primaryNetplayLabel(user: NetplayUserLike | null | undefined): string | null {
  if (!user) return null;
  return (
    user.netplayUsername?.trim() ||
    user.username.trim() ||
    user.displayName?.trim() ||
    null
  );
}
