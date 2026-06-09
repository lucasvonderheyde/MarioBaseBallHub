export type ParsedWeeklyMatchup = {
  awayTeamId: string;
  homeTeamId: string;
};

export function resolveTeamIdByName(
  name: string,
  teamNameToId: Map<string, string>,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  for (const [teamName, id] of teamNameToId) {
    if (teamName === trimmed) return id;
  }
  const lower = trimmed.toLowerCase();
  for (const [teamName, id] of teamNameToId) {
    if (teamName.toLowerCase() === lower) return id;
  }
  return null;
}

/** One matchup per line: "Away @ Home" or "Away vs Home" (Challonge-style). */
export function parseWeeklyMatchupsText(
  text: string,
  teamNameToId: Map<string, string>,
): { matchups: ParsedWeeklyMatchup[]; errors: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matchups: ParsedWeeklyMatchup[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const parsed = line.match(/^(.+?)\s*(?:@|vs\.?)\s*(.+)$/i);
    if (!parsed) {
      errors.push(`Line ${i + 1}: use "Away @ Home" or "Away vs Home" — got "${line}"`);
      continue;
    }

    const awayName = parsed[1]!.trim();
    const homeName = parsed[2]!.trim();
    const awayTeamId = resolveTeamIdByName(awayName, teamNameToId);
    const homeTeamId = resolveTeamIdByName(homeName, teamNameToId);

    if (!awayTeamId) {
      errors.push(`Line ${i + 1}: unknown away team "${awayName}"`);
    }
    if (!homeTeamId) {
      errors.push(`Line ${i + 1}: unknown home team "${homeName}"`);
    }
    if (!awayTeamId || !homeTeamId) continue;
    if (awayTeamId === homeTeamId) {
      errors.push(`Line ${i + 1}: away and home must be different teams`);
      continue;
    }

    matchups.push({ awayTeamId, homeTeamId });
  }

  return { matchups, errors };
}
