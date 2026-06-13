import fs from "fs";
import path from "path";
import { CHARACTER_CATALOG } from "@/data/character-catalog";

export type CharacterRatings = {
  characterClass: string;
  isCaptain: boolean;
  ability1: string;
  ability2: string;
  weight: string;
  starPitch: string;
  curveBallSpeed: string;
  fastBallSpeed: string;
  curve: string;
  cursedBall: string;
  curveControl: string;
  fieldingArm: string;
  throwingPower: string;
  speed: string;
  battingStance: string;
  starSwing: string;
  slapHitPower: string;
  chargeHitPower: string;
  bunting: string;
  horizontalTrajectory: string;
  verticalTrajectory: string;
  extra: string;
};

const csvPath = path.join(
  process.cwd(),
  "public/assets/characterStats/Mario Superstar Baseball Stats - Character Stats.csv",
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

function loadRatingsByCsvName(): Map<string, CharacterRatings> {
  const text = fs.readFileSync(csvPath, "utf8");
  const lines = text.trim().split("\n");
  const map = new Map<string, CharacterRatings>();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 27) continue;
    map.set(cols[0].trim(), {
      characterClass: cols[1],
      isCaptain: cols[2].toLowerCase() === "yes",
      ability1: cols[3],
      ability2: cols[4],
      weight: cols[5],
      starPitch: cols[6],
      curveBallSpeed: cols[7],
      fastBallSpeed: cols[8],
      curve: cols[9],
      cursedBall: cols[10],
      curveControl: cols[11],
      fieldingArm: cols[12],
      throwingPower: cols[13],
      speed: cols[14],
      battingStance: cols[15],
      starSwing: cols[16],
      slapHitPower: cols[17],
      chargeHitPower: cols[18],
      bunting: cols[19],
      horizontalTrajectory: cols[20],
      verticalTrajectory: cols[21],
      extra: cols[27] ?? "",
    });
  }
  return map;
}

const ratingsByCsvName = loadRatingsByCsvName();

/** Catalog display names that differ from the Character Stats CSV first column. */
const CSV_NAME_OVERRIDES: Record<string, string> = {
  "Paratroopa (Red)": "Koopa Paratroopa (Red)",
  "Paratroopa (Green)": "Koopa Paratroopa (Green)",
  "Dry Bones (Grey)": "Dry Bones (Gray)",
};

function csvNameForCatalogDisplay(displayName: string): string {
  return CSV_NAME_OVERRIDES[displayName] ?? displayName;
}

const ratingsByGameCharId = new Map<string, CharacterRatings>();
for (const row of CHARACTER_CATALOG) {
  const ratings = ratingsByCsvName.get(csvNameForCatalogDisplay(row.displayName));
  if (ratings) ratingsByGameCharId.set(row.gameCharId, ratings);
}

export function getCharacterRatings(gameCharId: string): CharacterRatings | null {
  return ratingsByGameCharId.get(gameCharId) ?? null;
}
