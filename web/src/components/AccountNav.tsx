import Link from "next/link";

type Tab = "profile" | "stats" | "upload";

type Props = {
  activeTab: Tab;
};

function tabHref(tab: Tab): string {
  if (tab === "profile") return "/account";
  if (tab === "upload") return "/account?tab=upload&section=season";
  if (tab === "stats") return "/account?tab=stats";
  return `/account?tab=${tab}`;
}

function tabClass(active: boolean): string {
  return active
    ? "border-b-2 border-amber-400 px-3 py-2 text-sm font-medium text-amber-400"
    : "border-b-2 border-transparent px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300";
}

export function AccountNav({ activeTab }: Props) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "stats", label: "Lifetime stats" },
    { id: "upload", label: "Upload games" },
  ];

  return (
    <nav className="mt-6 flex gap-1 border-b border-zinc-800" aria-label="Account sections">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tabHref(tab.id)}
          className={tabClass(activeTab === tab.id)}
          aria-current={activeTab === tab.id ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
