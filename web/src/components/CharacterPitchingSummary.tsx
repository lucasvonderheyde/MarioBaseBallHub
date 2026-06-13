import { PitchingTableRow } from "@/components/PitchingStatCells";
import { SectionHeading } from "@/components/SectionHeading";
import { pitchingStatHeaders } from "@/components/stats/stat-table-headers";
import {
  earnedRunAverage,
  formatEra,
  inningsPitched,
} from "@/domain/stats/batting-metrics";
import type { PitchingLine } from "@/lib/game-stats-queries";

type Props = {
  title: string;
  line: PitchingLine;
  compact?: boolean;
};

export function CharacterPitchingSummary({ title, line, compact = false }: Props) {
  if (compact) {
    return (
      <section>
        <SectionHeading>{title}</SectionHeading>
        <p className="mt-2 text-sm text-zinc-400">
          {line.games}G · {inningsPitched(line.outsPitched)} IP · {line.strikeouts} K ·{" "}
          {formatEra(earnedRunAverage(line.earnedRuns, line.outsPitched))} ERA ·{" "}
          {line.walks} BB
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionHeading>{title}</SectionHeading>
      <div className="msb-table-wrap">
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              {pitchingStatHeaders()}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-900">
              <PitchingTableRow line={line} />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
