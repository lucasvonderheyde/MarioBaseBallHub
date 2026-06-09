import type { BracketPicture, BracketSeries } from "@/domain/playoffs/bracket-model";

const BOX_W = 168;
const BOX_H = 52;
const ROW_GAP = 20;
const COL_GAP = 56;
const PAD = 16;

function seriesHeight(matchCount: number): number {
  return matchCount * BOX_H + (matchCount - 1) * ROW_GAP;
}

function seriesTop(roundIndex: number, slotIndex: number, baseMatchCount: number): number {
  const roundMatchCount = baseMatchCount / Math.pow(2, roundIndex);
  const unit = BOX_H + ROW_GAP;
  const slotOffset = slotIndex * unit * Math.pow(2, roundIndex);
  const centerBias = (Math.pow(2, roundIndex) - 1) * (unit / 2);
  return PAD + slotOffset + centerBias;
}

function teamLineOffset(position: "top" | "bottom"): number {
  return position === "top" ? 30 : 44;
}

function SeriesBox({
  series,
  x,
  y,
}: {
  series: BracketSeries;
  x: number;
  y: number;
}) {
  const topHighlight = series.complete && series.winnerId === series.top.teamId;
  const bottomHighlight =
    series.complete && series.winnerId === series.bottom.teamId;
  const score =
    series.bestOf > 1 ? `${series.homeWins}–${series.awayWins}` : null;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={BOX_W}
        height={BOX_H}
        rx={6}
        fill="#0c1222"
        stroke="#334155"
        strokeWidth={1}
      />
      <text x={8} y={16} fill="#94a3b8" fontSize={9} fontFamily="system-ui, sans-serif">
        {series.label}
        {series.bestOf > 1 ? ` · BO${series.bestOf}` : ""}
      </text>
      <TeamLine
        y={30}
        seed={series.top.seed}
        name={series.top.name}
        highlight={topHighlight}
      />
      <TeamLine
        y={44}
        seed={series.bottom.seed}
        name={series.bottom.name}
        highlight={bottomHighlight}
      />
      {score ? (
        <text
          x={BOX_W - 8}
          y={16}
          fill="#fbbf24"
          fontSize={9}
          textAnchor="end"
          fontFamily="system-ui, sans-serif"
        >
          {score}
        </text>
      ) : null}
    </g>
  );
}

function TeamLine({
  y,
  seed,
  name,
  highlight,
}: {
  y: number;
  seed: number | null;
  name: string;
  highlight: boolean;
}) {
  const seedLabel = seed != null ? `#${seed} ` : "";
  return (
    <text
      x={8}
      y={y}
      fill={highlight ? "#fbbf24" : "#e2e8f0"}
      fontSize={11}
      fontWeight={highlight ? 600 : 400}
      fontFamily="system-ui, sans-serif"
    >
      {seedLabel}
      {name.length > 18 ? `${name.slice(0, 17)}…` : name}
    </text>
  );
}

function Connector({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  const midX = (x1 + x2) / 2;
  return (
    <path
      d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
      fill="none"
      stroke="#475569"
      strokeWidth={1}
    />
  );
}

export function PlayoffBracketSvg({ bracket }: { bracket: BracketPicture }) {
  if (bracket.rounds.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Bracket requires a power-of-two team count (e.g. 8). Adjust main bracket size in
        season settings.
      </p>
    );
  }

  const baseMatchCount = bracket.rounds[0]!.series.length;
  const hasPlayIn = bracket.playIn.length > 0;
  const playInColWidth = hasPlayIn ? BOX_W + COL_GAP : 0;
  const bracketStartX = PAD + playInColWidth;
  const totalHeight = seriesHeight(baseMatchCount) + PAD * 2;
  const totalWidth =
    PAD * 2 +
    playInColWidth +
    bracket.rounds.length * BOX_W +
    (bracket.rounds.length - 1) * COL_GAP;

  return (
    <div className="msb-scroll-x mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="min-w-[720px] w-full"
        role="img"
        aria-label="Playoff bracket"
      >
        {hasPlayIn ? (
          <g>
            <text
              x={PAD}
              y={PAD - 4}
              fill="#64748b"
              fontSize={10}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              Play-in
            </text>
            {bracket.playIn.map((series) => {
              const qfSlot = series.feedsQfSlotIndex ?? 0;
              const position = series.feedsPosition ?? "bottom";
              const qfY = seriesTop(0, qfSlot, baseMatchCount);
              const playInY = qfY;
              const lineY = playInY + teamLineOffset(position);
              const qfX = bracketStartX;

              return (
                <g key={series.key}>
                  <SeriesBox series={series} x={PAD} y={playInY} />
                  <Connector
                    x1={PAD + BOX_W}
                    y1={lineY}
                    x2={qfX}
                    y2={qfY + teamLineOffset(position)}
                  />
                </g>
              );
            })}
          </g>
        ) : null}

        {bracket.rounds.map((round, roundIndex) => {
          const x = bracketStartX + roundIndex * (BOX_W + COL_GAP);
          return (
            <g key={round.roundIndex}>
              <text
                x={x}
                y={PAD - 4}
                fill="#64748b"
                fontSize={10}
                fontWeight={600}
                fontFamily="system-ui, sans-serif"
              >
                {round.label}
              </text>
              {round.series.map((series, slotIndex) => {
                const y = seriesTop(roundIndex, slotIndex, baseMatchCount);
                return (
                  <SeriesBox key={series.key} series={series} x={x} y={y} />
                );
              })}
            </g>
          );
        })}

        {bracket.rounds.slice(0, -1).map((round, roundIndex) => {
          const nextRound = bracket.rounds[roundIndex + 1]!;
          const x1 = bracketStartX + roundIndex * (BOX_W + COL_GAP) + BOX_W;
          const x2 = bracketStartX + (roundIndex + 1) * (BOX_W + COL_GAP);

          return round.series.map((series, slotIndex) => {
            const y1 = seriesTop(roundIndex, slotIndex, baseMatchCount) + BOX_H / 2;
            const nextSlot = Math.floor(slotIndex / 2);
            const y2 =
              seriesTop(roundIndex + 1, nextSlot, baseMatchCount) + BOX_H / 2;
            return (
              <Connector
                key={`${series.key}-conn`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
              />
            );
          });
        })}
      </svg>
    </div>
  );
}
