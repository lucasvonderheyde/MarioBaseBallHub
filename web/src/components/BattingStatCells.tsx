import { formatRate } from "@/domain/stats/batting-metrics";

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
      <td className="py-1 pr-2 tabular-nums">{ab}</td>
      <td className="py-1 pr-2 tabular-nums">{hits}</td>
      <td className="py-1 pr-2 tabular-nums">{hr}</td>
      <td className="py-1 pr-2 tabular-nums">{rbi}</td>
      <td className="py-1 pr-2 tabular-nums">{formatRate(ba)}</td>
      {showObpSlg ? (
        <>
          <td className="py-1 pr-2 tabular-nums">{formatRate(obp)}</td>
          <td className="py-1 pr-2 tabular-nums">{formatRate(slg)}</td>
        </>
      ) : null}
    </>
  );
}
