import Link from "next/link";

export type StatsSection = "overview" | "characters" | "h2h";

type Props = {
  activeSection: StatsSection;
};

function sectionHref(section: StatsSection): string {
  if (section === "overview") return "/account?tab=stats";
  return `/account?tab=stats&section=${section}`;
}

function sectionClass(active: boolean): string {
  return active
    ? "rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-amber-400"
    : "rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300";
}

export function AccountStatsNav({ activeSection }: Props) {
  const sections: { id: StatsSection; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "characters", label: "By character" },
    { id: "h2h", label: "Head-to-head" },
  ];

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Lifetime stats sections">
      {sections.map((section) => (
        <Link
          key={section.id}
          href={sectionHref(section.id)}
          className={sectionClass(activeSection === section.id)}
          aria-current={activeSection === section.id ? "page" : undefined}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
