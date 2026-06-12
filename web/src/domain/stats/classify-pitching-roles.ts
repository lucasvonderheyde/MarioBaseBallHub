import { z } from "zod";

export type PitchingRole = "starter" | "reliever";

export type PitcherAppearance = {
  teamSide: "Away" | "Home";
  rosterSlot: number;
  wasPitcher: boolean;
  outsPitched: number;
};

const eventSchema = z.object({
  "Event Num": z.coerce.number(),
  "Half Inning": z.coerce.number(),
  "Pitcher Roster Loc": z.coerce.number().optional(),
});

const eventsContainerSchema = z.object({
  Events: z.array(z.unknown()).optional(),
});

export function pitchingRoleKey(teamSide: "Away" | "Home", rosterSlot: number): string {
  return `${teamSide}\0${rosterSlot}`;
}

/**
 * Starter roster slots per side from the play-by-play Events array.
 * Half-inning 0 is the top (away bats, home defends), so the first top-half
 * event names the home starter and the first bottom-half event the away
 * starter. Returns null slots when the data is missing.
 */
export function findStarterSlotsFromEvents(data: unknown): {
  awayStarterSlot: number | null;
  homeStarterSlot: number | null;
} {
  const container = eventsContainerSchema.safeParse(data);
  const rawEvents = container.success ? container.data.Events ?? [] : [];

  let homeStarterSlot: number | null = null;
  let awayStarterSlot: number | null = null;
  let bestTopEventNum = Number.POSITIVE_INFINITY;
  let bestBottomEventNum = Number.POSITIVE_INFINITY;

  for (const raw of rawEvents) {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success || parsed.data["Pitcher Roster Loc"] == null) continue;
    const event = parsed.data;
    if (event["Half Inning"] === 0 && event["Event Num"] < bestTopEventNum) {
      bestTopEventNum = event["Event Num"];
      homeStarterSlot = event["Pitcher Roster Loc"] ?? null;
    }
    if (event["Half Inning"] === 1 && event["Event Num"] < bestBottomEventNum) {
      bestBottomEventNum = event["Event Num"];
      awayStarterSlot = event["Pitcher Roster Loc"] ?? null;
    }
  }

  return { awayStarterSlot, homeStarterSlot };
}

/**
 * Classifies every pitching appearance as starter or reliever, preferring
 * the play-by-play starter; when events are missing, falls back to the
 * most-outs pitcher per side (imperfect for early hooks, best available).
 */
export function classifyPitchingRoles(
  appearances: PitcherAppearance[],
  data: unknown,
): Map<string, PitchingRole> {
  const { awayStarterSlot, homeStarterSlot } = findStarterSlotsFromEvents(data);
  const roles = new Map<string, PitchingRole>();

  for (const side of ["Away", "Home"] as const) {
    const sidePitchers = appearances.filter(
      (row) => row.teamSide === side && (row.wasPitcher || row.outsPitched > 0),
    );
    if (sidePitchers.length === 0) continue;

    const eventStarterSlot = side === "Away" ? awayStarterSlot : homeStarterSlot;
    const starterSlot =
      eventStarterSlot != null &&
      sidePitchers.some((row) => row.rosterSlot === eventStarterSlot)
        ? eventStarterSlot
        : sidePitchers.reduce((best, row) =>
            row.outsPitched > best.outsPitched ? row : best,
          ).rosterSlot;

    for (const row of sidePitchers) {
      roles.set(
        pitchingRoleKey(side, row.rosterSlot),
        row.rosterSlot === starterSlot ? "starter" : "reliever",
      );
    }
  }

  return roles;
}
