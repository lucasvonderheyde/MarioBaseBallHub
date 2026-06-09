import Link from "next/link";

export type UploadSection = "season" | "batch";

type Props = {
  activeSection: UploadSection;
};

function sectionHref(section: UploadSection): string {
  return `/account?tab=upload&section=${section}`;
}

function sectionClass(active: boolean): string {
  return active
    ? "rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-amber-400"
    : "rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300";
}

export function AccountUploadNav({ activeSection }: Props) {
  const sections: { id: UploadSection; label: string; description: string }[] = [
    {
      id: "season",
      label: "Season games",
      description: "Report a specific scheduled matchup",
    },
    {
      id: "batch",
      label: "Lifetime batch",
      description: "Friendlies and extras for lifetime stats only",
    },
  ];

  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Upload methods"
    >
      {sections.map((section) => (
        <Link
          key={section.id}
          href={sectionHref(section.id)}
          className={sectionClass(activeSection === section.id)}
          aria-current={activeSection === section.id ? "page" : undefined}
          title={section.description}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
