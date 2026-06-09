import { BattingStatCells } from "@/components/BattingStatCells";
import { battingStatHeaders } from "@/components/stats/stat-table-headers";
import type { BattingLine } from "@/lib/game-stats-queries";
import { formatRate } from "@/domain/stats/batting-metrics";

type Props = {
  title: string;
  line: BattingLine;
  compact?: boolean;
};

export function CharacterStatSummary({ title, line, compact = false }: Props) {
  if (compact) {
    return (
      <section>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">
          {line.games}G · {line.ab} AB · {formatRate(line.ba)} AVG · {line.hr} HR ·{" "}
          {line.rbi} RBI · OBP {formatRate(line.obp)} · SLG {formatRate(line.slg)}
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="msb-table-wrap">
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              {battingStatHeaders({ includeG: true, includeObpSlg: true })}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-900">
              <td className="py-1 pr-2 tabular-nums">{line.games}</td>
              <BattingStatCells
                ab={line.ab}
                hits={line.hits}
                hr={line.hr}
                rbi={line.rbi}
                walks4ball={line.walks4ball}
                walksHbp={line.walksHbp}
                sacFly={line.sacFly}
                singles={line.singles}
                doubles={line.doubles}
                triples={line.triples}
                showObpSlg
              />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
