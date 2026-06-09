import fs from "fs";
import path from "path";
import { CHARACTER_CATALOG } from "@/data/character-catalog";

/** 32 playable chemistry identities — row/column order in the Chemistry CSV. */
export const CHEMISTRY_BASE_CHARACTERS = [
  "Mario",
  "Luigi",
  "Peach",
  "Daisy",
  "Yoshi",
  "Birdo",
  "Wario",
  "Waluigi",
  "Donkey Kong",
  "Diddy Kong",
  "Bowser",
  "Bowser Jr.",
  "Toad",
  "Koopa Troopa",
  "Shy Guy",
  "Goomba",
  "Toadsworth",
  "Magikoopa",
  "Dry Bones",
  "Boo",
  "Koopa Paratroopa",
  "Baby Mario",
  "Noki",
  "Paragoomba",
  "King Boo",
  "Pianta",
  "Baby Luigi",
  "Dixie Kong",
  "Hammer Bro",
  "Monty Mole",
  "Petey Piranha",
  "Toadette",
] as const;

export type ChemistryBaseCharacter = (typeof CHEMISTRY_BASE_CHARACTERS)[number];

const chemistryCsvPath = path.join(
  process.cwd(),
  "public/assets/characterStats/Mario Superstar Baseball Stats - Chemistry.csv",
);

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function loadChemistryMatrix(): number[][] {
  const text = fs.readFileSync(chemistryCsvPath, "utf8");
  const lines = text.trim().split("\n");
  const matrix: number[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const values = cols
      .slice(1, 1 + CHEMISTRY_BASE_CHARACTERS.length)
      .map((cell) => {
        const n = Number.parseInt(cell.trim(), 10);
        return Number.isFinite(n) ? n : 50;
      });
    if (values.length === CHEMISTRY_BASE_CHARACTERS.length) {
      matrix.push(values);
    }
  }
  if (matrix.length !== CHEMISTRY_BASE_CHARACTERS.length) {
    throw new Error(
      `Expected ${CHEMISTRY_BASE_CHARACTERS.length} chemistry rows, got ${matrix.length}`,
    );
  }
  return matrix;
}

const chemistryMatrix = loadChemistryMatrix();

const baseIndexByName = new Map<string, number>(
  CHEMISTRY_BASE_CHARACTERS.map((name, index) => [name.toLowerCase(), index]),
);

/** Maps catalog display names to a chemistry matrix identity. */
const displayNameToBase: Record<string, ChemistryBaseCharacter> = {
  "Donkey Kong": "Donkey Kong",
  "Bowser Jr.": "Bowser Jr.",
  "Koopa Troopa (Red)": "Koopa Troopa",
  "Koopa Troopa (Green)": "Koopa Troopa",
  "Paratroopa (Red)": "Koopa Paratroopa",
  "Paratroopa (Green)": "Koopa Paratroopa",
  "Magikoopa (Green)": "Magikoopa",
  "Magikoopa (Blue)": "Magikoopa",
  "Magikoopa (Red)": "Magikoopa",
  "Magikoopa (Yellow)": "Magikoopa",
  "Dry Bones (Grey)": "Dry Bones",
  "Dry Bones (Green)": "Dry Bones",
  "Dry Bones (Red)": "Dry Bones",
  "Dry Bones (Blue)": "Dry Bones",
  "Shy Guy (Green)": "Shy Guy",
  "Shy Guy (Blue)": "Shy Guy",
  "Shy Guy (Red)": "Shy Guy",
  "Shy Guy (Yellow)": "Shy Guy",
  "Shy Guy (Black)": "Shy Guy",
  "Toad (Green)": "Toad",
  "Toad (Red)": "Toad",
  "Toad (Blue)": "Toad",
  "Toad (Yellow)": "Toad",
  "Toad (Purple)": "Toad",
  "Noki (Green)": "Noki",
  "Noki (Red)": "Noki",
  "Boomerang Bro": "Hammer Bro",
  "Fire Bro": "Hammer Bro",
  "Petey Piranha": "Petey Piranha",
  "Monty Mole": "Monty Mole",
};

const chemistryIndexByGameCharId = new Map<string, number>();
for (const row of CHARACTER_CATALOG) {
  const base =
    displayNameToBase[row.displayName] ??
    (CHEMISTRY_BASE_CHARACTERS.includes(row.displayName as ChemistryBaseCharacter)
      ? (row.displayName as ChemistryBaseCharacter)
      : null);
  if (!base) continue;
  const index = baseIndexByName.get(base.toLowerCase());
  if (index != null) chemistryIndexByGameCharId.set(row.gameCharId, index);
}

export function chemistryIndexForChar(gameCharId: string): number | null {
  return chemistryIndexByGameCharId.get(gameCharId) ?? null;
}

export function chemistryValueBetween(
  indexA: number,
  indexB: number,
): number {
  if (indexA < 0 || indexB < 0) return 50;
  if (indexA >= chemistryMatrix.length || indexB >= chemistryMatrix.length) return 50;
  return chemistryMatrix[indexA]![indexB]!;
}

export function chemistryValueBetweenChars(
  charIdA: string,
  charIdB: string,
): number | null {
  const a = chemistryIndexForChar(charIdA);
  const b = chemistryIndexForChar(charIdB);
  if (a == null || b == null) return null;
  return chemistryValueBetween(a, b);
}

export function getChemistryMatrix(): readonly (readonly number[])[] {
  return chemistryMatrix;
}

export function chemistryTier(value: number): "great" | "good" | "neutral" | "bad" {
  if (value >= 80) return "great";
  if (value >= 60) return "good";
  if (value >= 40) return "neutral";
  return "bad";
}

export function averageRosterChemistry(charIds: string[]): number | null {
  const indices = charIds
    .map((id) => chemistryIndexForChar(id))
    .filter((index): index is number => index != null);
  if (indices.length < 2) return null;

  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < indices.length; i++) {
    for (let j = i + 1; j < indices.length; j++) {
      sum += chemistryValueBetween(indices[i]!, indices[j]!);
      pairs++;
    }
  }
  return sum / pairs;
}
