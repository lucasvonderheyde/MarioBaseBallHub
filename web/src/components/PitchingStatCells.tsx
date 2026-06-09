import { inningsPitched } from "@/domain/stats/batting-metrics";
import type { PitchingLine } from "@/lib/game-stats-queries";

type Props = Pick<
  PitchingLine,
  | "outsPitched"
  | "battersFaced"
  | "hitsAllowed"
  | "runsAllowed"
  | "earnedRuns"
  | "walks"
  | "strikeouts"
  | "hrAllowed"
  | "pitchesThrown"
>;

export function PitchingStatCells({
  outsPitched,
  battersFaced,
  hitsAllowed,
  runsAllowed,
  earnedRuns,
  walks,
  strikeouts,
  hrAllowed,
  pitchesThrown,
}: Props) {
  return (
    <>
      <td className="py-1 pr-2 tabular-nums">{inningsPitched(outsPitched)}</td>
      <td className="py-1 pr-2 tabular-nums">{battersFaced}</td>
      <td className="py-1 pr-2 tabular-nums">{hitsAllowed}</td>
      <td className="py-1 pr-2 tabular-nums">{runsAllowed}</td>
      <td className="py-1 pr-2 tabular-nums">{earnedRuns}</td>
      <td className="py-1 pr-2 tabular-nums">{walks}</td>
      <td className="py-1 pr-2 tabular-nums">{strikeouts}</td>
      <td className="py-1 pr-2 tabular-nums">{hrAllowed}</td>
      <td className="py-1 pr-2 tabular-nums">{pitchesThrown}</td>
    </>
  );
}

export const pitchingTableHeaders = (
  <>
    <th className="py-1 pr-2">G</th>
    <th className="py-1 pr-2">IP</th>
    <th className="py-1 pr-2">BF</th>
    <th className="py-1 pr-2">H</th>
    <th className="py-1 pr-2">R</th>
    <th className="py-1 pr-2">ER</th>
    <th className="py-1 pr-2">BB</th>
    <th className="py-1 pr-2">K</th>
    <th className="py-1 pr-2">HR</th>
    <th className="py-1 pr-2">Pit</th>
  </>
);

export function PitchingTableRow({ line }: { line: PitchingLine }) {
  return (
    <>
      <td className="py-1 pr-2 tabular-nums">{line.games}</td>
      <PitchingStatCells
        outsPitched={line.outsPitched}
        battersFaced={line.battersFaced}
        hitsAllowed={line.hitsAllowed}
        runsAllowed={line.runsAllowed}
        earnedRuns={line.earnedRuns}
        walks={line.walks}
        strikeouts={line.strikeouts}
        hrAllowed={line.hrAllowed}
        pitchesThrown={line.pitchesThrown}
      />
    </>
  );
}
