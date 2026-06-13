import { StatColumnHeader } from "@/components/stats/StatColumnHeader";

type HeaderOptions = {
  className?: string;
};

export function battingStatHeaders({
  className = "py-1 pr-2",
  includeG = false,
  includeH = true,
  includeObpSlg = true,
}: HeaderOptions & {
  includeG?: boolean;
  includeH?: boolean;
  includeObpSlg?: boolean;
} = {}) {
  return (
    <>
      {includeG ? <StatColumnHeader abbr="G" className={className} /> : null}
      <StatColumnHeader abbr="AB" className={className} />
      {includeH ? <StatColumnHeader abbr="H" className={className} /> : null}
      <StatColumnHeader abbr="HR" className={className} />
      <StatColumnHeader abbr="RBI" className={className} />
      <StatColumnHeader abbr="AVG" className={className} />
      {includeObpSlg ? (
        <>
          <StatColumnHeader abbr="OBP" className={className} />
          <StatColumnHeader abbr="SLG" className={className} />
        </>
      ) : null}
    </>
  );
}

export function boxScoreBattingHeaders({ className = "py-1 pr-2" }: HeaderOptions = {}) {
  return (
    <>
      <StatColumnHeader abbr="AB" className={className} />
      <StatColumnHeader abbr="H" className={className} />
      <StatColumnHeader abbr="HR" className={className} />
      <StatColumnHeader abbr="RBI" className={className} />
      <StatColumnHeader abbr="BB" className={className} />
      <StatColumnHeader abbr="K" className={className} />
      <StatColumnHeader abbr="AVG" className={className} />
    </>
  );
}

export function pitchingStatHeaders({ className = "py-1 pr-2", includeG = true }: HeaderOptions & { includeG?: boolean } = {}) {
  return (
    <>
      {includeG ? <StatColumnHeader abbr="G" className={className} /> : null}
      <StatColumnHeader abbr="IP" className={className} />
      <StatColumnHeader abbr="BF" className={className} />
      <StatColumnHeader abbr="H" className={className} description="Hits allowed" />
      <StatColumnHeader abbr="R" className={className} description="Runs allowed" />
      <StatColumnHeader abbr="ER" className={className} />
      <StatColumnHeader abbr="ERA" className={className} />
      <StatColumnHeader abbr="BB" className={className} description="Walks allowed" />
      <StatColumnHeader abbr="K" className={className} description="Strikeouts (pitching)" />
      <StatColumnHeader abbr="HR" className={className} description="Home runs allowed" />
      <StatColumnHeader abbr="Pit" className={className} />
    </>
  );
}

export function fieldingStatHeaders({ className = "py-1 pr-2" }: HeaderOptions = {}) {
  return (
    <>
      <StatColumnHeader abbr="G" className={className} description="Games in the field" />
      <StatColumnHeader abbr="Pos" className={className} description="Primary position" />
      <StatColumnHeader abbr="Outs" className={className} description="Outs recorded" />
      <StatColumnHeader abbr="O/G" className={className} description="Outs per game" />
      <StatColumnHeader abbr="BF" className={className} description="Batters faced while fielding" />
      <StatColumnHeader abbr="BF/G" className={className} description="Batters faced per game in field" />
      <StatColumnHeader abbr="BP" className={className} description="Big Plays" />
      <StatColumnHeader abbr="Long HR" className={className} description="Longest home run" />
    </>
  );
}

export function standingsStatHeaders({ className = "py-2 pr-2" }: HeaderOptions = {}) {
  return (
    <>
      <StatColumnHeader abbr="W" className={className} />
      <StatColumnHeader abbr="L" className={className} />
      <StatColumnHeader abbr="RF" className={className} />
      <StatColumnHeader abbr="RA" className={className} />
    </>
  );
}

export function teamRecordStatHeaders({ className = "py-1 pr-2" }: HeaderOptions = {}) {
  return (
    <>
      <StatColumnHeader abbr="G" className={className} />
      <StatColumnHeader abbr="W-L" className={className} />
      <StatColumnHeader abbr="RF" className={className} />
      <StatColumnHeader abbr="RA" className={className} />
    </>
  );
}

/** Batting columns used on stadium leaderboards (no OBP). */
export function stadiumLeaderBattingHeaders({ className = "py-1 pr-2" }: HeaderOptions = {}) {
  return (
    <>
      <StatColumnHeader abbr="AB" className={className} />
      <StatColumnHeader abbr="AVG" className={className} />
      <StatColumnHeader abbr="HR" className={className} />
      <StatColumnHeader abbr="RBI" className={className} />
      <StatColumnHeader abbr="SLG" className={className} />
    </>
  );
}

/** Batting by stadium with games column. */
export function stadiumBattingStatHeaders({ className = "py-1 pr-2" }: HeaderOptions = {}) {
  return (
    <>
      <StatColumnHeader abbr="G" className={className} />
      <StatColumnHeader abbr="AB" className={className} />
      <StatColumnHeader abbr="AVG" className={className} />
      <StatColumnHeader abbr="HR" className={className} />
      <StatColumnHeader abbr="RBI" className={className} />
      <StatColumnHeader abbr="SLG" className={className} />
    </>
  );
}
