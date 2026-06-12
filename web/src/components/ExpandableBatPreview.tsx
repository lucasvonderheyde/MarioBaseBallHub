"use client";

import { useEffect, useState } from "react";
import { characterBatUrl } from "@/lib/asset-urls";

type Props = {
  batFile: string;
};

export function ExpandableBatPreview({ batFile }: Props) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex min-h-28 min-w-44 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 sm:min-h-32 sm:min-w-52"
        aria-label="Expand bat preview"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={characterBatUrl(batFile)}
          alt=""
          width={160}
          height={48}
          className="h-12 w-auto max-w-[10rem] object-contain"
        />
        <p className="text-xs text-zinc-500">Bat · click to enlarge</p>
      </button>

      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Bat preview"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-4 top-4 rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Close
          </button>
          <div
            className="flex max-h-full max-w-full flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={characterBatUrl(batFile)}
              alt=""
              className="max-h-[min(70vh,32rem)] w-auto max-w-[min(92vw,48rem)] object-contain"
            />
            <p className="text-sm text-zinc-400">Click outside or press Escape to close</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
