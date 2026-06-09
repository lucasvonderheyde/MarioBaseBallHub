import { pitchingStatHeaders } from "@/components/stats/stat-table-headers";
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

export const pitchingTableHeaders = pitchingStatHeaders();

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
