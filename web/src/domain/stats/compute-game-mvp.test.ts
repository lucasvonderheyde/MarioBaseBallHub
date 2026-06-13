import { describe, expect, it } from "vitest";
import { computeGameMvp } from "./compute-game-mvp";

function statRow(
  overrides: Partial<{
    charId: string;
    teamId: string;
    teamSide: "Away" | "Home";
    hr: number;
    rbi: number;
    hits: number;
    bigPlays: number;
    strikeoutsDef: number;
    pitchingRole: "starter" | "reliever" | null;
    wasPitcher: boolean;
    outsPitched: number;
  }> = {},
) {
  return {
    id: "row",
    gameId: "game",
    seasonId: "season",
    teamId: overrides.teamId ?? "away-team",
    teamSide: overrides.teamSide ?? "Away",
    rosterSlot: 0,
    charOccurrenceIndex: 0,
    charId: overrides.charId ?? "Mario",
    isCaptain: false,
    isSuperstar: false,
    battingHand: "Right",
    fieldingHand: "Right",
    ab: 4,
    hits: overrides.hits ?? 2,
    singles: 1,
    doubles: 0,
    triples: 0,
    hr: overrides.hr ?? 0,
    walks4ball: 0,
    walksHbp: 0,
    strikeoutsOff: 0,
    rbi: overrides.rbi ?? 1,
    basesStolen: 0,
    sacFly: 0,
    bunts: 0,
    starHits: 0,
    wasPitcher: overrides.wasPitcher ?? false,
    pitchingRole: overrides.pitchingRole ?? null,
    battersFaced: overrides.outsPitched ? 12 : 0,
    runsAllowed: 0,
    earnedRuns: 0,
    pitchingWalks: 0,
    battersHit: 0,
    hitsAllowed: 2,
    hrAllowed: 0,
    pitchesThrown: 40,
    outsPitched: overrides.outsPitched ?? 0,
    strikeoutsDef: overrides.strikeoutsDef ?? 0,
    starPitches: 0,
    bigPlays: overrides.bigPlays ?? 0,
  };
}

describe("computeGameMvp", () => {
  it("favors a multi-home-run line over modest pitching", () => {
    const mvp = computeGameMvp(
      [
        statRow({ charId: "Mario", hr: 2, rbi: 5, hits: 3 }),
        statRow({
          charId: "Peach",
          teamId: "home-team",
          teamSide: "Home",
          wasPitcher: true,
          pitchingRole: "starter",
          outsPitched: 15,
          strikeoutsDef: 6,
          hits: 0,
          rbi: 0,
        }),
      ],
      "away-team",
    );
    expect(mvp?.charId).toBe("Mario");
  });

  it("adds the winning starter bonus when scores are close", () => {
    const mvp = computeGameMvp(
      [
        statRow({ charId: "Luigi", teamId: "home-team", teamSide: "Home", rbi: 2, hits: 2 }),
        statRow({
          charId: "Peach",
          teamId: "home-team",
          teamSide: "Home",
          wasPitcher: true,
          pitchingRole: "starter",
          outsPitched: 15,
          strikeoutsDef: 4,
          hits: 0,
          rbi: 0,
        }),
      ],
      "home-team",
    );
    expect(mvp?.charId).toBe("Peach");
  });
});
