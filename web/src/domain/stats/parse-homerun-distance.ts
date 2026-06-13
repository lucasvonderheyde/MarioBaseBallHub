import { z } from "zod";

const rosterKeyRe = /^(Away|Home) Roster (\d+)$/;

function rosterSideKey(teamSide: "Away" | "Home", rosterSlot: number): string {
  return `${teamSide}\0${rosterSlot}`;
}

function battingTeamSide(halfInning: number): "Away" | "Home" {
  return halfInning === 0 ? "Away" : "Home";
}

const contactSchema = z
  .object({
    "Ball Landing Position - X": z.coerce.number(),
    "Ball Landing Position - Z": z.coerce.number(),
  })
  .passthrough();

const eventSchema = z
  .object({
    "Half Inning": z.coerce.number(),
    "Batter Roster Loc": z.coerce.number(),
    "Result of AB": z.string(),
    Pitch: z
      .object({
        Contact: contactSchema.optional(),
      })
      .optional(),
  })
  .passthrough();

/** Euclidean distance from home plate using landing X/Z (MSSB field units). */
export function homerunDistanceFromLanding(x: number, z: number): number {
  return Math.sqrt(x * x + z * z);
}

/**
 * Longest HR distance per roster slot in a game.
 * Key: `${teamSide}\0${rosterSlot}` (matches pitching role keys).
 */
export function parseHomerunDistancesByRoster(data: unknown): Map<string, number> {
  if (typeof data !== "object" || data == null) return new Map();

  const root = data as Record<string, unknown>;
  const statsBlock = root["Character Game Stats"];
  if (typeof statsBlock !== "object" || statsBlock == null) return new Map();

  const charBySideSlot = new Map<string, string>();
  for (const [key, value] of Object.entries(statsBlock as Record<string, unknown>)) {
    const match = rosterKeyRe.exec(key);
    if (!match || typeof value !== "object" || value == null) continue;
    const side = match[1] as "Away" | "Home";
    const slot = Number(match[2]);
    const charId = (value as Record<string, unknown>).CharID;
    if (typeof charId === "string") {
      charBySideSlot.set(rosterSideKey(side, slot), charId);
    }
  }

  const bySideSlot = new Map<string, number>();
  const events = root.Events;
  if (!Array.isArray(events)) return bySideSlot;

  for (const raw of events) {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success || parsed.data["Result of AB"] !== "HR") continue;

    const contact = parsed.data.Pitch?.Contact;
    if (!contact) continue;

    const side = battingTeamSide(parsed.data["Half Inning"]);
    const slot = parsed.data["Batter Roster Loc"];
    const key = rosterSideKey(side, slot);
    const distance = homerunDistanceFromLanding(
      contact["Ball Landing Position - X"],
      contact["Ball Landing Position - Z"],
    );

    const current = bySideSlot.get(key) ?? 0;
    if (distance > current) bySideSlot.set(key, distance);
  }

  return bySideSlot;
}

export function homerunDistanceForRosterSlot(
  distances: Map<string, number>,
  teamSide: "Away" | "Home",
  rosterSlot: number,
): number | null {
  const distance = distances.get(rosterSideKey(teamSide, rosterSlot));
  return distance != null && distance > 0 ? distance : null;
}
