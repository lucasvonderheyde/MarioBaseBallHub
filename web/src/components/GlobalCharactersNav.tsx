import Link from "next/link";

type Section = "library" | "chemistry" | "compare";

type Props = {
  active: Section;
};

function tabClass(active: boolean): string {
  return `${
    active
      ? "border-b-2 border-amber-400 text-sm font-medium text-amber-400"
      : "border-b-2 border-transparent text-sm text-zinc-500 hover:text-zinc-300"
  } shrink-0 px-3 py-2`;
}

export function GlobalCharactersNav({ active }: Props) {
  return (
    <nav
      className="msb-scroll-x mt-6 flex gap-1 border-b border-zinc-800"
      aria-label="Character library sections"
    >
      <Link href="/characters" className={tabClass(active === "library")}>
        Stats library
      </Link>
      <Link href="/characters/chemistry" className={tabClass(active === "chemistry")}>
        Chemistry
      </Link>
      <Link href="/characters/compare" className={tabClass(active === "compare")}>
        Comparer
      </Link>
    </nav>
  );
}
