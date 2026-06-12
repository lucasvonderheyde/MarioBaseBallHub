"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  leagueId: string;
  activeSeasonId: string | null;
  isMember: boolean;
  isAdmin: boolean;
  showClaim: boolean;
  myTeamHref: string | null;
  showDraft?: boolean;
};

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

function navClass(active: boolean): string {
  return active ? "msb-btn-nav msb-btn-nav-active" : "msb-btn-nav";
}

export function LeagueNav({
  leagueId,
  activeSeasonId,
  isMember,
  isAdmin,
  showClaim,
  myTeamHref,
  showDraft = false,
}: Props) {
  const pathname = usePathname();
  const seasonMatch = pathname.match(/\/seasons\/([^/]+)/);
  const contextSeasonId = seasonMatch?.[1] ?? activeSeasonId;

  const leagueHome = `/leagues/${leagueId}`;
  const seasonHub = activeSeasonId
    ? `/leagues/${leagueId}/seasons/${activeSeasonId}`
    : null;
  const standingsHref = contextSeasonId
    ? `/leagues/${leagueId}/standings?season=${contextSeasonId}`
    : `/leagues/${leagueId}/standings`;
  const charactersHref = contextSeasonId
    ? `/leagues/${leagueId}/characters?season=${contextSeasonId}`
    : `/leagues/${leagueId}/characters`;
  const stadiumsHref = contextSeasonId
    ? `/leagues/${leagueId}/stadiums?season=${contextSeasonId}`
    : `/leagues/${leagueId}/stadiums`;

  const items: NavItem[] = [];

  if (isMember || isAdmin) {
    if (seasonHub) {
      items.push({
        href: seasonHub,
        label: "Home",
        match: (path) =>
          path.startsWith(`${leagueHome}/seasons/${activeSeasonId}`) &&
          !path.includes("/admin") &&
          !path.includes("/rosters") &&
          !path.includes("/draft"),
      });
    }

    if (myTeamHref) {
      items.push({
        href: myTeamHref,
        label: "My Team",
        match: (path) => path === myTeamHref,
      });
    }

    if (isAdmin) {
      items.push({
        href: leagueHome,
        label: "Commissioner",
        match: (path) => path === leagueHome,
      });
    }

    if (showDraft && contextSeasonId) {
      items.push({
        href: `/leagues/${leagueId}/seasons/${contextSeasonId}/draft`,
        label: "Draft",
        match: (path) => path.includes("/draft"),
      });
    }

    items.push(
      {
        href: `/leagues/${leagueId}/schedule`,
        label: "Schedule",
        match: (path) => path.startsWith(`${leagueHome}/schedule`),
      },
      {
        href: standingsHref,
        label: "Standings",
        match: (path) => path.startsWith(`${leagueHome}/standings`),
      },
      {
        href: charactersHref,
        label: "Characters",
        match: (path) => path.startsWith(`${leagueHome}/characters`),
      },
      {
        href: stadiumsHref,
        label: "Stadiums",
        match: (path) => path.startsWith(`${leagueHome}/stadiums`),
      },
      {
        href: `/leagues/${leagueId}/rivalries`,
        label: "Rivalries",
        match: (path) => path.startsWith(`${leagueHome}/rivalries`),
      },
    );
  }

  if (showClaim) {
    items.push({
      href: `/leagues/${leagueId}/claim`,
      label: "Claim team",
      match: (path) => path.startsWith(`${leagueHome}/claim`),
    });
  }

  return (
    <div className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-2.5 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-x-3 sm:px-6 lg:px-8">
        <Link
          href="/leagues"
          className="shrink-0 self-start text-xs text-zinc-500 hover:text-zinc-300 sm:justify-self-start sm:text-sm"
        >
          All leagues
        </Link>
        <nav
          className="msb-scroll-x flex w-full items-center justify-center gap-2 pb-0.5 sm:w-auto sm:justify-self-center sm:pb-0 md:flex-wrap md:overflow-x-visible"
          aria-label="League navigation"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navClass(item.match(pathname))}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden sm:block" aria-hidden />
      </div>
    </div>
  );
}
