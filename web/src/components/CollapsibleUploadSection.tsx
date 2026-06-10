"use client";

import { useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  label?: string;
};

export function CollapsibleUploadSection({
  children,
  label = "Upload game",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-950/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-900/40 sm:px-5"
        aria-expanded={open}
      >
        <span className="font-medium text-amber-300">{label}</span>
        <span className="text-xs text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <div className="border-t border-zinc-800/80 px-4 py-4 sm:px-5">{children}</div>
      ) : null}
    </div>
  );
}
