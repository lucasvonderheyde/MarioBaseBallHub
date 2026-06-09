import type { CharacterRatings } from "@/data/character-ratings";
import { averageRosterChemistry } from "@/domain/chemistry/chemistry-data";

function parseStat(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 50;
}

/** Single-number talent estimate from static CSV attributes (0–100 scale). */
export function characterPowerFromRatings(ratings: CharacterRatings): number {
  const hitting =
    parseStat(ratings.chargeHitPower) * 0.3 +
    parseStat(ratings.slapHitPower) * 0.2 +
    parseStat(ratings.speed) * 0.25 +
    parseStat(ratings.bunting) * 0.1 +
    parseStat(ratings.throwingPower) * 0.15;

  const pitching =
    parseStat(ratings.fastBallSpeed) * (100 / 168) * 0.35 +
    parseStat(ratings.curve) * 0.25 +
    parseStat(ratings.curveControl) * 0.2 +
    parseStat(ratings.fieldingArm) * 0.2;

  const captainBonus = ratings.isCaptain ? 2 : 0;
  return Math.min(100, hitting * 0.55 + pitching * 0.45 + captainBonus);
}

export function rosterTalentScore(
  charIds: string[],
  ratingsLookup: (charId: string) => CharacterRatings | null,
): number {
  if (charIds.length === 0) return 50;

  const powers = charIds
    .map((id) => ratingsLookup(id))
    .filter((r): r is CharacterRatings => r != null)
    .map(characterPowerFromRatings)
    .sort((a, b) => b - a);

  if (powers.length === 0) return 50;

  const topNine = powers.slice(0, 9);
  const avg = topNine.reduce((sum, p) => sum + p, 0) / topNine.length;

  const chemAvg = averageRosterChemistry(charIds);
  const chemBonus = chemAvg == null ? 0 : ((chemAvg - 50) / 50) * 6;

  return avg + chemBonus;
}
