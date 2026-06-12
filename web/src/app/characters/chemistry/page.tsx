import Link from "next/link";
import { redirect } from "next/navigation";
import { CharacterIcon } from "@/components/CharacterIcon";
import { GlobalCharactersNav } from "@/components/GlobalCharactersNav";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { CHARACTER_CATALOG } from "@/data/character-catalog";
import {
  CHEMISTRY_BASE_CHARACTERS,
  chemistryIndexForChar,
  chemistryTier,
  chemistryValueBetween,
} from "@/domain/chemistry/chemistry-data";
import { getCurrentUser } from "@/lib/auth";

const BASE_TO_CATALOG_CHAR: Record<string, string> = {
  Mario: "Mario",
  Luigi: "Luigi",
  Peach: "Peach",
  Daisy: "Daisy",
  Yoshi: "Yoshi",
  Birdo: "Birdo",
  Wario: "Wario",
  Waluigi: "Waluigi",
  "Donkey Kong": "DK",
  "Diddy Kong": "Diddy",
  Bowser: "Bowser",
  "Bowser Jr.": "Bowser Jr",
  Toad: "Toad(R)",
  "Koopa Troopa": "Koopa(G)",
  "Shy Guy": "Shy Guy(R)",
  Goomba: "Goomba",
  Toadsworth: "Toadsworth",
  Magikoopa: "Magikoopa(B)",
  "Dry Bones": "Dry Bones(Gy)",
  Boo: "Boo",
  "Koopa Paratroopa": "Paratroopa(G)",
  "Baby Mario": "Baby Mario",
  Noki: "Noki(G)",
  Paragoomba: "Paragoomba",
  "King Boo": "King Boo",
  Pianta: "Pianta",
  "Baby Luigi": "Baby Luigi",
  "Dixie Kong": "Dixie",
  "Hammer Bro": "Hammer Bro",
  "Monty Mole": "Monty",
  "Petey Piranha": "Petey",
  Toadette: "Toadette",
};

function tierClass(tier: ReturnType<typeof chemistryTier>): string {
  if (tier === "great") return "bg-emerald-950/50 text-emerald-300";
  if (tier === "good") return "bg-sky-950/50 text-sky-300";
  if (tier === "bad") return "bg-red-950/50 text-red-300";
  return "bg-zinc-900 text-zinc-400";
}

export default async function ChemistryPage() {
  const user = await getCurrentUser();

  const baseRows = CHEMISTRY_BASE_CHARACTERS.map((name, index) => {
    const gameCharId = BASE_TO_CATALOG_CHAR[name];
    const catalog = CHARACTER_CATALOG.find((row) => row.gameCharId === gameCharId);
    return {
      index,
      name,
      gameCharId: catalog?.gameCharId ?? null,
      displayName: catalog?.displayName ?? name,
    };
  });

  const variantCount = CHARACTER_CATALOG.filter(
    (row) => chemistryIndexForChar(row.gameCharId) != null,
  ).length;

  return (
    <PageShell width="wide">
      <PageHero
        title="Character chemistry"
        subtitle="Pairwise compatibility from Mario Superstar Baseball. Values of 80+ boost performance; 20 or below hurts it."
      />
      <GlobalCharactersNav active="chemistry" />

      <section className="mt-8 msb-panel p-4 sm:p-5">
        <h2 className="text-lg font-semibold">How chemistry works</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-zinc-400">
          <li>Each of the 32 base identities has a compatibility score (0–100) with every other identity.</li>
          <li>Color variants share the same chemistry row (e.g. all Toad colors use Toad&apos;s links).</li>
          <li>Team star ratings and in-game bonuses scale with captain chemistry and active links on base.</li>
          <li>
            Championship and matchup odds on the season hub factor average roster chemistry into team power.
          </li>
        </ul>
        <p className="mt-3 text-sm text-zinc-500">
          {variantCount} playable characters map into this matrix.{" "}
          <Link href="/characters" className="text-amber-400 hover:underline">
            Back to stats library
          </Link>
        </p>
      </section>

      <section className="mt-8 msb-panel overflow-hidden p-2 sm:p-4">
        <h2 className="px-2 text-lg font-semibold sm:px-0">Full chemistry matrix</h2>
        <p className="mt-1 px-2 text-sm text-zinc-500 sm:px-0">
          Scroll horizontally on smaller screens. Diagonal entries are neutral (50).
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-max text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="sticky left-0 z-10 bg-zinc-950 px-2 py-2">Character</th>
                {baseRows.map((row) => (
                  <th
                    key={row.index}
                    className="px-1 py-2 text-center font-normal"
                    title={row.displayName}
                  >
                    <span className="inline-block max-w-[3.5rem] truncate">
                      {row.name.split(" ")[0]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {baseRows.map((rowA) => (
                <tr key={rowA.index} className="border-b border-zinc-900">
                  <th className="sticky left-0 z-10 bg-zinc-950 px-2 py-1.5 text-left font-medium text-zinc-300">
                    <div className="flex items-center gap-2">
                      {rowA.gameCharId ? (
                        <CharacterIcon
                          charId={rowA.gameCharId}
                          displayName={rowA.displayName}
                          size={24}
                        />
                      ) : null}
                      <span className="whitespace-nowrap">{rowA.name}</span>
                    </div>
                  </th>
                  {baseRows.map((rowB) => {
                    const value = chemistryValueBetween(rowA.index, rowB.index);
                    const tier = chemistryTier(value);
                    return (
                      <td
                        key={rowB.index}
                        className={`px-1 py-1.5 text-center tabular-nums ${tierClass(tier)}`}
                        title={`${rowA.name} + ${rowB.name}: ${value}`}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 msb-panel p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Lookup a character&apos;s best links</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {baseRows.map((row) => {
            const links = baseRows
              .filter((other) => other.index !== row.index)
              .map((other) => ({
                name: other.displayName,
                value: chemistryValueBetween(row.index, other.index),
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 4);

            return (
              <div
                key={row.index}
                className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"
              >
                <div className="flex items-center gap-2">
                  {row.gameCharId ? (
                    <CharacterIcon
                      charId={row.gameCharId}
                      displayName={row.displayName}
                      size={32}
                    />
                  ) : null}
                  <div>
                    <p className="font-medium text-zinc-200">{row.displayName}</p>
                    {row.gameCharId ? (
                      <Link
                        href={`/characters/${encodeURIComponent(row.gameCharId)}`}
                        className="text-xs text-amber-400 hover:underline"
                      >
                        View stats
                      </Link>
                    ) : null}
                  </div>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  {links.map((link) => (
                    <li key={link.name} className="flex justify-between gap-2">
                      <span>{link.name}</span>
                      <span className="tabular-nums text-zinc-300">{link.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
