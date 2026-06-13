import {
  FIELDING_POSITIONS,
  type FieldingPositionMap,
} from "@/domain/stats/fielding-by-position";
import {
  fieldingRatePerGame,
  formatFieldingRate,
  formatPrimaryPosition,
} from "@/domain/stats/fielding-metrics";
import type { FieldingLine } from "@/lib/game-stats-queries";

type Props = {
  line: FieldingLine;
};

export function FieldingTableRow({ line }: Props) {
  const outsPerGame = fieldingRatePerGame(line.outs, line.games);
  const battersPerGame = fieldingRatePerGame(line.battersInField, line.games);

  return (
    <>
      <td className="py-1 pr-2 tabular-nums">{line.games}</td>
      <td className="py-1 pr-2 tabular-nums">{formatPrimaryPosition(line.battersByPosition)}</td>
      <td className="py-1 pr-2 tabular-nums">{line.outs}</td>
      <td className="py-1 pr-2 tabular-nums">{formatFieldingRate(outsPerGame)}</td>
      <td className="py-1 pr-2 tabular-nums">{line.battersInField}</td>
      <td className="py-1 pr-2 tabular-nums">{formatFieldingRate(battersPerGame)}</td>
      <td className="py-1 pr-2 tabular-nums">{line.bigPlays}</td>
    </>
  );
}

export function FieldingPositionBreakdown({
  outsByPosition,
  battersByPosition,
}: {
  outsByPosition: FieldingPositionMap;
  battersByPosition: FieldingPositionMap;
}) {
  const positions = FIELDING_POSITIONS.filter(
    (position) => (outsByPosition[position] ?? 0) > 0 || (battersByPosition[position] ?? 0) > 0,
  );

  if (positions.length === 0) {
    return <p className="mt-2 text-sm text-zinc-500">No position splits yet.</p>;
  }

  return (
    <div className="msb-table-wrap">
      <table className="mt-2 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500">
            <th className="py-1 pr-2">Pos</th>
            <th className="py-1 pr-2">Outs</th>
            <th className="py-1 pr-2">Batters faced in field</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={position} className="border-b border-zinc-900">
              <td className="py-1 pr-2">{position}</td>
              <td className="py-1 pr-2 tabular-nums">{outsByPosition[position] ?? 0}</td>
              <td className="py-1 pr-2 tabular-nums">{battersByPosition[position] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
