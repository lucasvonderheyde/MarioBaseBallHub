"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "msb-theme";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = getPreferredTheme();
    applyTheme(initial);
    setTheme(initial);
    setReady(true);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="rounded-md border border-zinc-700 p-1.5 text-zinc-300 hover:border-msb-sky hover:bg-zinc-800"
    >
      {!ready ? (
        <span className="inline-block h-4 w-4" aria-hidden />
      ) : theme === "dark" ? (
        <SunIcon />
      ) : (
        <MoonIcon />
      )}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm4 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-.464 4.95.707.707a1 1 0 0 0 1.414-1.414l-.707-.707a1 1 0 0 0-1.414 1.414Zm2.12-10.607a1 1 0 0 1 0 1.414l-.706.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.413 0ZM17 11a1 1 0 1 0 0-2h-1a1 1 0 1 0 0 2h1Zm-7 4a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H10Zm-4 0a1 1 0 0 0 0 2h.01a1 1 0 1 0 0-2H6Zm-2.828-2.828a1 1 0 0 0-1.414 1.414l.707.707a1 1 0 0 0 1.414-1.414l-.707-.707ZM4 11a1 1 0 1 0 0-2H3a1 1 0 0 0 0 2h1Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586Z" />
    </svg>
  );
}
