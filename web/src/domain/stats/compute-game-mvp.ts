import type { characterGameStats } from "@/db/schema";

type GameStatRow = typeof characterGameStats.$inferSelect;

export type GameMvpPick = {
  charId: string;
  teamId: string;
  teamSide: "Away" | "Home";
  score: number;
  summary: string;
};

function battingMvpPoints(row: GameStatRow): number {
  return (
    row.hr * 10 +
    row.bigPlays * 5 +
    row.rbi * 3 +
    row.hits +
    row.walks4ball +
    row.walksHbp +
    row.basesStolen
  );
}

function pitchingMvpPoints(row: GameStatRow): number {
  return row.strikeoutsDef * 3 + row.bigPlays * 5;
}

function playerMvpPoints(row: GameStatRow): number {
  const pitched =
    row.wasPitcher || row.outsPitched > 0 || row.battersFaced > 0;
  return battingMvpPoints(row) + (pitched ? pitchingMvpPoints(row) : 0);
}

function mainPitcherBonus(row: GameStatRow, winningTeamId: string | null): number {
  if (winningTeamId == null || row.teamId !== winningTeamId) return 0;
  if (row.pitchingRole !== "starter") return 0;
  return 5;
}

function mvpSummary(row: GameStatRow): string {
  const parts: string[] = [];
  if (row.hr > 0) parts.push(`${row.hr} HR`);
  if (row.rbi > 0) parts.push(`${row.rbi} RBI`);
  if (row.hits > 0 && row.hr === 0) parts.push(`${row.hits} H`);
  if (row.strikeoutsDef > 0) parts.push(`${row.strikeoutsDef} K`);
  if (row.bigPlays > 0) parts.push(`${row.bigPlays} big play${row.bigPlays === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(", ") : "Balanced line";
}

function compareMvpCandidates(a: GameStatRow, b: GameStatRow): number {
  if (b.hr !== a.hr) return b.hr - a.hr;
  if (b.rbi !== a.rbi) return b.rbi - a.rbi;
  if (b.hits !== a.hits) return b.hits - a.hits;
  if (b.strikeoutsDef !== a.strikeoutsDef) return b.strikeoutsDef - a.strikeoutsDef;
  return b.bigPlays - a.bigPlays;
}

/**
 * MSSB does not store a named MVP field in decoded JSON. The post-game screen
 * uses a point formula (HR, RBI, big plays, pitching, etc.). This mirrors that
 * scoring from persisted character lines.
 */
export function computeGameMvp(
  rows: GameStatRow[],
  winningTeamId: string | null,
): GameMvpPick | null {
  if (rows.length === 0) return null;

  let best: GameStatRow | null = null;
  let bestScore = -1;

  for (const row of rows) {
    const score = playerMvpPoints(row) + mainPitcherBonus(row, winningTeamId);
    if (score > bestScore) {
      best = row;
      bestScore = score;
      continue;
    }
    if (score === bestScore && best != null && compareMvpCandidates(row, best) < 0) {
      best = row;
    }
  }

  if (!best || bestScore <= 0) return null;

  return {
    charId: best.charId,
    teamId: best.teamId,
    teamSide: best.teamSide,
    score: bestScore,
    summary: mvpSummary(best),
  };
}
