import { z } from "zod";
import {
  parseFieldingByPosition,
  type FieldingByPosition,
} from "./fielding-by-position";
import { normalizeStadiumId } from "./stadium-id";

const offensiveSchema = z.object({
  "At Bats": z.coerce.number(),
  Hits: z.coerce.number(),
  Singles: z.coerce.number(),
  Doubles: z.coerce.number(),
  Triples: z.coerce.number(),
  Homeruns: z.coerce.number(),
  "Successful Bunts": z.coerce.number(),
  "Sac Flys": z.coerce.number(),
  Strikeouts: z.coerce.number(),
  "Walks (4 Balls)": z.coerce.number(),
  "Walks (Hit)": z.coerce.number(),
  RBI: z.coerce.number(),
  "Bases Stolen": z.coerce.number(),
  "Star Hits": z.coerce.number(),
});

const defensiveSchema = z.object({
  "Was Pitcher": z.coerce.number(),
  "Batters Faced": z.coerce.number(),
  "Runs Allowed": z.coerce.number(),
  "Earned Runs": z.coerce.number(),
  "Batters Walked": z.coerce.number(),
  "Batters Hit": z.coerce.number(),
  "Hits Allowed": z.coerce.number(),
  "HRs Allowed": z.coerce.number(),
  "Pitches Thrown": z.coerce.number(),
  Strikeouts: z.coerce.number(),
  "Star Pitches Thrown": z.coerce.number(),
  "Big Plays": z.coerce.number(),
  "Outs Pitched": z.coerce.number(),
  "Batters Per Position": z.array(z.record(z.string(), z.coerce.number())).optional(),
  "Batter Outs Per Position": z.array(z.record(z.string(), z.coerce.number())).optional(),
  "Outs Per Position": z.array(z.record(z.string(), z.coerce.number())).optional(),
});

const rosterEntrySchema = z.object({
  Team: z.union([z.string(), z.coerce.number()]).optional(),
  CharID: z.string(),
  Superstar: z.coerce.number(),
  Captain: z.coerce.number(),
  "Fielding Hand": z.string(),
  "Batting Hand": z.string(),
  "Offensive Stats": offensiveSchema,
  "Defensive Stats": defensiveSchema,
});

/** MSSB JSON uses Team 0 = away, Team 1 = home on each roster line. */
export function jsonTeamIndexToSide(
  teamIndex: string | number | null | undefined,
): "Away" | "Home" | null {
  if (teamIndex == null || teamIndex === "") return null;
  const normalized = String(teamIndex).trim();
  if (normalized === "1") return "Home";
  if (normalized === "0") return "Away";
  return null;
}

export type ParsedCharacterGameStat = {
  teamSide: "Away" | "Home";
  rosterSlot: number;
  /** 0-based index among same charId on this team in this game (by roster slot). */
  charOccurrenceIndex: number;
  charId: string;
  isCaptain: boolean;
  isSuperstar: boolean;
  battingHand: string;
  fieldingHand: string;
  ab: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  hr: number;
  walks4ball: number;
  walksHbp: number;
  strikeoutsOff: number;
  rbi: number;
  basesStolen: number;
  sacFly: number;
  bunts: number;
  starHits: number;
  wasPitcher: boolean;
  battersFaced: number;
  runsAllowed: number;
  earnedRuns: number;
  pitchingWalks: number;
  battersHit: number;
  hitsAllowed: number;
  hrAllowed: number;
  pitchesThrown: number;
  outsPitched: number;
  strikeoutsDef: number;
  starPitches: number;
  bigPlays: number;
  fieldingByPosition: FieldingByPosition;
};

export type ParsedGameStats = {
  stadiumId: string | null;
  inningsPlayed: number | null;
  characterStats: ParsedCharacterGameStat[];
};

const rosterKeyRe = /^(Away|Home) Roster (\d+)$/;

type CharOccurrenceInput = {
  teamSide: "Away" | "Home";
  rosterSlot: number;
  charId: string;
};

/** Assigns occurrence index so duplicate charIds on one team stay distinct. */
export function assignCharOccurrenceIndexes<T extends CharOccurrenceInput>(
  stats: T[],
): (T & { charOccurrenceIndex: number })[] {
  const byTeamChar = new Map<string, T[]>();
  for (const row of stats) {
    const key = `${row.teamSide}\0${row.charId}`;
    const group = byTeamChar.get(key);
    if (group) group.push(row);
    else byTeamChar.set(key, [row]);
  }

  const occurrenceBySideSlot = new Map<string, number>();
  for (const group of byTeamChar.values()) {
    group.sort((a, b) => a.rosterSlot - b.rosterSlot);
    group.forEach((row, index) => {
      occurrenceBySideSlot.set(`${row.teamSide}\0${row.rosterSlot}`, index);
    });
  }

  return stats.map((row) => ({
    ...row,
    charOccurrenceIndex:
      occurrenceBySideSlot.get(`${row.teamSide}\0${row.rosterSlot}`) ?? 0,
  }));
}

/** Parses Character Game Stats from a decoded MSSB JSON object. */
export function parseCharacterGameStats(data: unknown): ParsedGameStats {
  if (typeof data !== "object" || data == null) {
    throw new Error("Invalid stats JSON");
  }
  const root = data as Record<string, unknown>;
  const stadiumRaw = root["StadiumID"];
  const inningsRaw = root["Innings Played"];
  const block = root["Character Game Stats"];
  if (typeof block !== "object" || block == null) {
    throw new Error("Character Game Stats missing");
  }

  const characterStats: Omit<ParsedCharacterGameStat, "charOccurrenceIndex">[] = [];
  for (const [key, value] of Object.entries(block as Record<string, unknown>)) {
    const m = rosterKeyRe.exec(key);
    if (!m) continue;
    const keySide = m[1] as "Away" | "Home";
    const rosterSlot = Number(m[2]);
    const parsed = rosterEntrySchema.safeParse(value);
    if (!parsed.success) {
      throw new Error(`Invalid roster entry: ${key}`);
    }
    const e = parsed.data;
    const teamSide = jsonTeamIndexToSide(e.Team) ?? keySide;
    const off = e["Offensive Stats"];
    const def = e["Defensive Stats"];
    characterStats.push({
      teamSide,
      rosterSlot,
      charId: e.CharID,
      isCaptain: e.Captain === 1,
      isSuperstar: e.Superstar === 1,
      battingHand: e["Batting Hand"],
      fieldingHand: e["Fielding Hand"],
      ab: off["At Bats"],
      hits: off.Hits,
      singles: off.Singles,
      doubles: off.Doubles,
      triples: off.Triples,
      hr: off.Homeruns,
      walks4ball: off["Walks (4 Balls)"],
      walksHbp: off["Walks (Hit)"],
      strikeoutsOff: off.Strikeouts,
      rbi: off.RBI,
      basesStolen: off["Bases Stolen"],
      sacFly: off["Sac Flys"],
      bunts: off["Successful Bunts"],
      starHits: off["Star Hits"],
      wasPitcher: def["Was Pitcher"] === 1,
      battersFaced: def["Batters Faced"],
      runsAllowed: def["Runs Allowed"],
      earnedRuns: def["Earned Runs"],
      pitchingWalks: def["Batters Walked"],
      battersHit: def["Batters Hit"],
      hitsAllowed: def["Hits Allowed"],
      hrAllowed: def["HRs Allowed"],
      pitchesThrown: def["Pitches Thrown"],
      outsPitched: def["Outs Pitched"],
      strikeoutsDef: def.Strikeouts,
      starPitches: def["Star Pitches Thrown"],
      bigPlays: def["Big Plays"],
      fieldingByPosition: parseFieldingByPosition(def as Record<string, unknown>),
    });
  }

  const sorted = characterStats.sort(
    (a, b) =>
      a.teamSide.localeCompare(b.teamSide) || a.rosterSlot - b.rosterSlot,
  );

  return {
    stadiumId: normalizeStadiumId(typeof stadiumRaw === "string" ? stadiumRaw : null),
    inningsPlayed:
      typeof inningsRaw === "number"
        ? inningsRaw
        : typeof inningsRaw === "string"
          ? Number(inningsRaw)
          : null,
    characterStats: assignCharOccurrenceIndexes(sorted) as ParsedCharacterGameStat[],
  };
}

/** True when Result of AB marks a completed plate appearance (not an intermediate pitch). */
export function isCompletedPlateAppearance(resultOfAb: string): boolean {
  return resultOfAb !== "None";
}
