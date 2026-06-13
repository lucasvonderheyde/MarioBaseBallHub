import { formatRate } from "@/domain/stats/batting-metrics";
import { formatHomerunDistance } from "@/domain/stats/fielding-metrics";

type Props = {
  ab: number;
  hits: number;
  hr: number;
  rbi: number;
  walks4ball: number;
  walksHbp: number;
  sacFly: number;
  singles: number;
  doubles: number;
  triples: number;
  showObpSlg?: boolean;
  showLongHr?: boolean;
  longestHrDistance?: number | null;
  cellClassName?: string;
};

export function BattingStatCells({
  ab,
  hits,
  hr,
  rbi,
  walks4ball,
  walksHbp,
  sacFly,
  singles,
  doubles,
  triples,
  showObpSlg = false,
  showLongHr = false,
  longestHrDistance = null,
  cellClassName = "py-1 pr-2 tabular-nums",
}: Props) {
  const ba = ab === 0 ? null : hits / ab;
  const obp =
    ab + walks4ball + walksHbp + sacFly === 0
      ? null
      : (hits + walks4ball + walksHbp) / (ab + walks4ball + walksHbp + sacFly);
  const slg =
    ab === 0 ? null : (singles + 2 * doubles + 3 * triples + 4 * hr) / ab;

  return (
    <>
      <td className={cellClassName}>{ab}</td>
      <td className={cellClassName}>{hits}</td>
      <td className={cellClassName}>{hr}</td>
      <td className={cellClassName}>{rbi}</td>
      <td className={cellClassName}>{formatRate(ba)}</td>
      {showObpSlg ? (
        <>
          <td className={cellClassName}>{formatRate(obp)}</td>
          <td className={cellClassName}>{formatRate(slg)}</td>
        </>
      ) : null}
      {showLongHr ? (
        <td className={cellClassName}>{formatHomerunDistance(longestHrDistance)}</td>
      ) : null}
    </>
  );
}
