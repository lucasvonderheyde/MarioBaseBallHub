/** Season settings / admin page — keep server-action redirects here after form submits. */
export function seasonAdminPath(
  leagueId: string,
  seasonId: string,
  query?: Record<string, string | number | undefined | null>,
): string {
  const base = `/leagues/${leagueId}/seasons/${seasonId}/admin`;
  if (!query) return base;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
