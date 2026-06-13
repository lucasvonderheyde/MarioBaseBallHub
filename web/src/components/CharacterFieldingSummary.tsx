import { FieldingPositionBreakdown, FieldingTableRow } from "@/components/FieldingStatCells";
import { SectionHeading } from "@/components/SectionHeading";
import { fieldingStatHeaders } from "@/components/stats/stat-table-headers";
import {
  fieldingRatePerGame,
  formatFieldingRate,
  formatPrimaryPosition,
} from "@/domain/stats/fielding-metrics";
import type { FieldingLine } from "@/lib/game-stats-queries";

type Props = {
  title: string;
  line: FieldingLine;
  compact?: boolean;
};

export function CharacterFieldingSummary({ title, line, compact = false }: Props) {
  if (compact) {
    return (
      <section>
        <SectionHeading>{title}</SectionHeading>
        <p className="mt-2 text-sm text-zinc-400">
          {line.games}G · {formatPrimaryPosition(line.battersByPosition)} · {line.outs} outs ·{" "}
          {formatFieldingRate(fieldingRatePerGame(line.outs, line.games))} O/G · {line.bigPlays}{" "}
          big plays
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
              {fieldingStatHeaders()}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-900">
              <FieldingTableRow line={line} />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-6">
        <SectionHeading>By position</SectionHeading>
        <FieldingPositionBreakdown
          outsByPosition={line.outsByPosition}
          battersByPosition={line.battersByPosition}
        />
      </div>
    </section>
  );
}
