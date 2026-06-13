"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type LeagueSeasonNavOption = {
  href: string;
  label: string;
  leagueName: string;
};

type Props = {
  options: LeagueSeasonNavOption[];
};

const triggerClass =
  "inline-flex max-w-full items-center justify-center gap-1.5 rounded-md border border-amber-800/50 bg-amber-950/30 px-3 py-1.5 text-sm font-medium text-amber-200 transition-colors hover:border-amber-700/60 hover:bg-amber-950/50";

export function LeagueSeasonSwitcher({ options }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current =
    options.find((option) => {
      const leagueBase = option.href.split("/seasons")[0]!;
      return pathname === leagueBase || pathname.startsWith(`${leagueBase}/`);
    }) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (options.length === 0 || !current) return null;

  if (options.length === 1) {
    return (
      <div className="order-3 flex w-full justify-center sm:order-0 sm:absolute sm:left-1/2 sm:w-auto sm:-translate-x-1/2">
        <Link href={current.href} className={`${triggerClass} max-w-[14rem]`}>
          <span className="truncate">{current.leagueName}</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative order-3 flex w-full justify-center sm:order-0 sm:absolute sm:left-1/2 sm:w-auto sm:-translate-x-1/2"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        className={`${triggerClass} max-w-[min(100%,14rem)]`}
      >
        <span className="truncate">{current.leagueName}</span>
        <span className="shrink-0 text-xs text-amber-400/80" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Switch league"
          className="absolute left-1/2 top-[calc(100%+0.35rem)] z-50 max-h-64 w-max min-w-[12rem] max-w-[min(90vw,18rem)] -translate-x-1/2 overflow-y-auto rounded-md border border-amber-900/50 bg-zinc-950 py-1 shadow-lg"
        >
          {options.map((option) => {
            const isCurrent = option.href === current.href;
            return (
              <li key={option.href} role="option" aria-selected={isCurrent}>
                <Link
                  href={option.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 text-sm transition-colors hover:bg-amber-950/40 ${
                    isCurrent ? "bg-amber-950/30 text-amber-200" : "text-zinc-300"
                  }`}
                >
                  <span className="block truncate font-medium">{option.leagueName}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {option.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
