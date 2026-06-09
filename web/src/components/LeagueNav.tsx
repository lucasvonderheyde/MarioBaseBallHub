"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  leagueId: string;
  leagueName: string;
  activeSeasonId: string | null;
  activeSeasonName: string | null;
  isMember: boolean;
  showClaim: boolean;
  myTeamHref: string | null;
  myTeamName: string | null;
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
  leagueName,
  activeSeasonId,
  activeSeasonName,
  isMember,
  showClaim,
  myTeamHref,
  myTeamName,
}: Props) {
  const pathname = usePathname();
  const seasonMatch = pathname.match(/\/seasons\/([^/]+)/);
  const contextSeasonId = seasonMatch?.[1] ?? activeSeasonId;

  const playoffsHref = contextSeasonId
    ? `/leagues/${leagueId}/playoffs?season=${contextSeasonId}`
    : `/leagues/${leagueId}/playoffs`;
  const charactersHref = contextSeasonId
    ? `/leagues/${leagueId}/characters?season=${contextSeasonId}`
    : `/leagues/${leagueId}/characters`;
  const stadiumsHref = contextSeasonId
    ? `/leagues/${leagueId}/stadiums?season=${contextSeasonId}`
    : `/leagues/${leagueId}/stadiums`;

  const leagueHome = `/leagues/${leagueId}`;
  const items: NavItem[] = [
    {
      href: leagueHome,
      label: leagueName,
      match: (path) => path === leagueHome,
    },
  ];

  if (isMember) {
    items.push(
      {
        href: `/leagues/${leagueId}/schedule`,
        label: "Schedule",
        match: (path) => path.startsWith(`${leagueHome}/schedule`),
      },
      {
        href: playoffsHref,
        label: "Playoffs",
        match: (path) => path.startsWith(`${leagueHome}/playoffs`),
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
    );

    if (activeSeasonId && activeSeasonName) {
      items.push({
        href: `/leagues/${leagueId}/seasons/${activeSeasonId}`,
        label: activeSeasonName,
        match: (path) => path.startsWith(`${leagueHome}/seasons/${activeSeasonId}`),
      });
    }

    if (myTeamHref && myTeamName) {
      items.push({
        href: myTeamHref,
        label: "My team",
        match: (path) => path === myTeamHref,
      });
    }
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
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link
          href="/leagues"
          className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 sm:text-sm"
        >
          All leagues
        </Link>
        <span className="hidden text-zinc-700 sm:inline" aria-hidden>
          /
        </span>
        <nav
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          aria-label={`${leagueName} navigation`}
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
      </div>
    </div>
  );
}
