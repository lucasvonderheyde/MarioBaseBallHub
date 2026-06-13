import { describe, expect, it } from "vitest";
import {
  findSeriesMatchup,
  listPlayoffSeriesMatchups,
  seriesKeyForTeams,
} from "@/domain/inky/series-matchups";

type GameRow = {
  game: {
    id: string;
    slotInRound: number;
    awayTeamId: string;
    homeTeamId: string;
    statsRawJson: string | null;
    homeScore: number | null;
    awayScore: number | null;
  };
  round: {
    id: string;
    roundNumber: number;
    phase: "regular" | "playoffs";
  };
};

function makeGame(input: {
  id: string;
  roundId: string;
  roundNumber: number;
  phase?: "regular" | "playoffs";
  slot: number;
  awayTeamId: string;
  homeTeamId: string;
  awayScore?: number;
  homeScore?: number;
}): GameRow {
  return {
    game: {
      id: input.id,
      slotInRound: input.slot,
      awayTeamId: input.awayTeamId,
      homeTeamId: input.homeTeamId,
      statsRawJson: input.awayScore != null ? "{}" : null,
      awayScore: input.awayScore ?? null,
      homeScore: input.homeScore ?? null,
    },
    round: {
      id: input.roundId,
      roundNumber: input.roundNumber,
      phase: input.phase ?? "playoffs",
    },
  };
}

describe("series-matchups", () => {
  it("builds stable series keys", () => {
    expect(seriesKeyForTeams("round-1", "team-b", "team-a")).toBe(
      "round-1:team-a:team-b",
    );
  });

  it("groups multi-game playoff series", () => {
    const games = [
      makeGame({
        id: "g1",
        roundId: "r1",
        roundNumber: 1,
        slot: 1,
        awayTeamId: "alpha",
        homeTeamId: "beta",
        awayScore: 3,
        homeScore: 2,
      }),
      makeGame({
        id: "g2",
        roundId: "r1",
        roundNumber: 1,
        slot: 2,
        awayTeamId: "beta",
        homeTeamId: "alpha",
        awayScore: 1,
        homeScore: 4,
      }),
    ];

    const matchups = listPlayoffSeriesMatchups(games as Parameters<typeof listPlayoffSeriesMatchups>[0]);
    expect(matchups).toHaveLength(1);
    expect(matchups[0]?.playedCount).toBe(2);
    expect(matchups[0]?.totalCount).toBe(2);
    expect(matchups[0]?.isComplete).toBe(true);

    const key = seriesKeyForTeams("r1", "alpha", "beta");
    expect(findSeriesMatchup(games as Parameters<typeof findSeriesMatchup>[0], key)?.games).toHaveLength(2);
  });

  it("ignores single-game pairings", () => {
    const games = [
      makeGame({
        id: "g1",
        roundId: "r1",
        roundNumber: 1,
        slot: 1,
        awayTeamId: "alpha",
        homeTeamId: "beta",
        awayScore: 3,
        homeScore: 2,
      }),
    ];
    expect(listPlayoffSeriesMatchups(games as Parameters<typeof listPlayoffSeriesMatchups>[0])).toHaveLength(0);
  });
});
