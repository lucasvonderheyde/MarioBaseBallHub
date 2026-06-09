/** Short stat column abbreviations → hover descriptions for tables. */
export const STAT_GLOSSARY: Record<string, string> = {
  G: "Games played",
  AB: "At-bats",
  H: "Hits",
  HR: "Home runs",
  RBI: "Runs batted in",
  AVG: "Batting average (hits ÷ at-bats)",
  OBP: "On-base percentage",
  SLG: "Slugging percentage",
  BB: "Walks (bases on balls and hit by pitch)",
  K: "Strikeouts",
  IP: "Innings pitched",
  BF: "Batters faced",
  R: "Runs",
  ER: "Earned runs",
  Pit: "Pitches thrown",
  W: "Wins",
  L: "Losses",
  RF: "Runs scored",
  RA: "Runs allowed",
  "W-L": "Win–loss record",
  ERA: "Earned run average",
};

export function statDescription(abbr: string): string | undefined {
  return STAT_GLOSSARY[abbr];
}
