import { z } from "zod";
import { normalizeStadiumId } from "./stadium-id";

const decodedSchema = z.object({
  GameID: z.string(),
  "Away Player": z.string(),
  "Home Player": z.string(),
  "Away Score": z.coerce.number(),
  "Home Score": z.coerce.number(),
  "StadiumID": z.string().optional(),
});

export function normalizeStatsGameId(raw: string): string {
  return raw.replace(/,/g, "").trim();
}

export type DecodedGameSummary = {
  statsGameId: string;
  awayPlayer: string;
  homePlayer: string;
  awayScore: number;
  homeScore: number;
  stadiumId?: string;
  rawJson: string;
};
export function parseDecodedGameFile(jsonText: string): DecodedGameSummary {
  let data: unknown;
  try {
    data = JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error("Invalid JSON");
  }
  const parsed = decodedSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Decoded stats file missing required fields");
  }
  const d = parsed.data;
  return {
    statsGameId: normalizeStatsGameId(d.GameID),
    awayPlayer: d["Away Player"].trim(),
    homePlayer: d["Home Player"].trim(),
    awayScore: d["Away Score"],
    homeScore: d["Home Score"],
    stadiumId: normalizeStadiumId(d["StadiumID"]) ?? undefined,
    rawJson: jsonText,
  };
}
