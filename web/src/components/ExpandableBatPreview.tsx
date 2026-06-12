"use client";

import { useState } from "react";
import { characterBatUrl } from "@/lib/asset-urls";

type Props = {
  batFile: string;
};

export function ExpandableBatPreview({ batFile }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      className={`flex min-h-28 min-w-44 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 sm:min-h-32 sm:min-w-52 ${
        expanded ? "ring-1 ring-amber-700/40" : ""
      }`}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse bat preview" : "Expand bat preview"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={characterBatUrl(batFile)}
        alt=""
        width={expanded ? 320 : 160}
        height={expanded ? 96 : 48}
        className={`w-auto object-contain transition-all duration-200 ${
          expanded ? "h-24 max-w-[20rem]" : "h-12 max-w-[10rem]"
        }`}
      />
      <p className="text-xs text-zinc-500">{expanded ? "Bat · click to shrink" : "Bat"}</p>
    </button>
  );
}
