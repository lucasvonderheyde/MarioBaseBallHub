import Link from "next/link";
import type { ReactNode } from "react";

type PageHeroProps = {
  title: string;
  eyebrow?: string;
  badge?: string;
  subtitle?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
  className?: string;
  /** page = left-aligned commissioner-style; hero = centered season hub (default) */
  variant?: "hero" | "page";
};

export function PageHero({
  title,
  eyebrow,
  badge,
  subtitle,
  backHref,
  backLabel,
  children,
  className = "",
  variant = "hero",
}: PageHeroProps) {
  const isPage = variant === "page";

  return (
    <header
      className={`mb-8 border-b border-zinc-800/60 pb-6 ${isPage ? "text-left" : "text-center"} ${className}`}
    >
      {backHref ? (
        <div className={`mb-3 ${isPage ? "" : "text-center"}`}>
          <Link
            href={backHref}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← {backLabel ?? "Back"}
          </Link>
        </div>
      ) : null}
      {eyebrow ? (
        <p
          className={`text-xs font-semibold uppercase tracking-[0.2em] text-msb-gold-bright sm:text-sm ${isPage ? "" : ""}`}
        >
          {eyebrow}
        </p>
      ) : null}
      <div
        className={`flex flex-wrap items-center gap-3 ${eyebrow ? "mt-2" : ""} ${isPage ? "" : "justify-center"}`}
      >
        <h1
          className={
            isPage
              ? "text-2xl font-bold text-zinc-50"
              : "text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl"
          }
        >
          {title}
        </h1>
        {badge ? <span className="msb-badge shrink-0">{badge}</span> : null}
      </div>
      {subtitle ? (
        <div
          className={`mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 ${isPage ? "" : "mx-auto"}`}
        >
          {subtitle}
        </div>
      ) : null}
      {children ? (
        <div
          className={`mt-4 flex flex-wrap items-center gap-2 ${isPage ? "" : "justify-center"}`}
        >
          {children}
        </div>
      ) : null}
    </header>
  );
}

type SeasonSectionHeaderProps = {
  seasonName: string;
  statusLabel?: string;
  href?: string;
  hrefLabel?: string;
};

export function SeasonSectionHeader({
  seasonName,
  statusLabel,
  href,
  hrefLabel = "Season hub →",
}: SeasonSectionHeaderProps) {
  return (
    <div className="border-b border-zinc-800/50 pb-4 text-center">
      <h2 className="text-xl font-bold text-zinc-100 sm:text-2xl">{seasonName}</h2>
      {statusLabel ? (
        <p className="mt-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
          {statusLabel}
        </p>
      ) : null}
      {href ? (
        <Link
          href={href}
          className="mt-2 inline-block text-sm text-amber-400 hover:underline"
        >
          {hrefLabel}
        </Link>
      ) : null}
    </div>
  );
}
