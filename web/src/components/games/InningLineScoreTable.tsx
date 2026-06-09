import type { InningLineScore } from "@/domain/stats/parse-line-score";
import { StatColumnHeader } from "@/components/stats/StatColumnHeader";

type Props = {
  awayTeamName: string;
  homeTeamName: string;
  lineScore: InningLineScore;
  awayScore: number;
  homeScore: number;
};

export function InningLineScoreTable({
  awayTeamName,
  homeTeamName,
  lineScore,
  awayScore,
  homeScore,
}: Props) {
  const awayWon = awayScore > homeScore;
  const homeWon = homeScore > awayScore;

  return (
    <div className="msb-table-wrap">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500">
            <th className="py-2 pr-3">Team</th>
            {lineScore.inningNumbers.map((inning) => (
              <th key={inning} className="px-2 py-2 text-center tabular-nums">
                {inning}
              </th>
            ))}
            <StatColumnHeader
              abbr="R"
              className="px-2 py-2 text-center tabular-nums"
              description="Runs (total)"
            />
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-zinc-900">
            <td className="py-2 pr-3 font-medium text-zinc-200">{awayTeamName}</td>
            {lineScore.awayRunsByInning.map((runs, index) => (
              <td key={`away-${index}`} className="px-2 py-2 text-center tabular-nums">
                {runs}
              </td>
            ))}
            <td
              className={`px-2 py-2 text-center tabular-nums font-semibold ${
                awayWon ? "text-amber-400" : "text-zinc-200"
              }`}
            >
              {awayScore}
            </td>
          </tr>
          <tr className="border-b border-zinc-900">
            <td className="py-2 pr-3 font-medium text-zinc-200">{homeTeamName}</td>
            {lineScore.homeRunsByInning.map((runs, index) => (
              <td key={`home-${index}`} className="px-2 py-2 text-center tabular-nums">
                {runs}
              </td>
            ))}
            <td
              className={`px-2 py-2 text-center tabular-nums font-semibold ${
                homeWon ? "text-amber-400" : "text-zinc-200"
              }`}
            >
              {homeScore}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
