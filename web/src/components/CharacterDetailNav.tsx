import Link from "next/link";

type Tab = "hitting" | "pitching" | "fielding" | "attributes";

type Props = {
  leagueId: string;
  charId: string;
  activeTab: Tab;
  seasonId?: string;
  hasAttributes: boolean;
};

function tabHref(
  leagueId: string,
  charId: string,
  tab: Tab,
  seasonId?: string,
): string {
  const params = new URLSearchParams();
  if (seasonId) params.set("season", seasonId);
  if (tab !== "hitting") params.set("tab", tab);
  const query = params.toString();
  return `/leagues/${leagueId}/characters/${encodeURIComponent(charId)}${query ? `?${query}` : ""}`;
}

function tabClass(active: boolean): string {
  return `${
    active
      ? "border-b-2 border-amber-400 text-sm font-medium text-amber-400"
      : "border-b-2 border-transparent text-sm text-zinc-500 hover:text-zinc-300"
  } shrink-0 px-3 py-2`;
}

export function CharacterDetailNav({
  leagueId,
  charId,
  activeTab,
  seasonId,
  hasAttributes,
}: Props) {
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "hitting", label: "Hitting", show: true },
    { id: "pitching", label: "Pitching", show: true },
    { id: "fielding", label: "Fielding", show: true },
    { id: "attributes", label: "Attributes", show: hasAttributes },
  ];

  return (
    <nav
      className="msb-scroll-x mt-8 flex gap-1 border-b border-zinc-800"
      aria-label="Character sections"
    >
      {tabs
        .filter((tab) => tab.show)
        .map((tab) => (
          <Link
            key={tab.id}
            href={tabHref(leagueId, charId, tab.id, seasonId)}
            className={tabClass(activeTab === tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
    </nav>
  );
}
