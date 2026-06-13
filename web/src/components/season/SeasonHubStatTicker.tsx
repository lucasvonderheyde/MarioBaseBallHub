"use client";

import { useEffect, useState } from "react";

type Props = {
  lines: string[];
  intervalMs?: number;
};

export function SeasonHubStatTicker({ lines, intervalMs = 6000 }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (lines.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [lines.length, intervalMs]);

  if (lines.length === 0) return null;

  const line = lines[index] ?? lines[0]!;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2"
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600/80">
        Stat line
      </p>
      <p key={line} className="mt-0.5 text-xs leading-snug text-zinc-400">
        {line}
      </p>
    </div>
  );
}
