import { describe, expect, it } from "vitest";
import { buildPlayoffPicture } from "./build-playoff-picture";
import { DEFAULT_PLAYOFF_SETTINGS } from "./playoff-settings";

describe("build-playoff-picture", () => {
  const standings = [
    { teamId: "t1", name: "A", wins: 10, losses: 2 },
    { teamId: "t2", name: "B", wins: 9, losses: 3 },
    { teamId: "t3", name: "C", wins: 8, losses: 4 },
    { teamId: "t4", name: "D", wins: 7, losses: 5 },
    { teamId: "t5", name: "E", wins: 6, losses: 6 },
    { teamId: "t6", name: "F", wins: 5, losses: 7 },
    { teamId: "t7", name: "G", wins: 4, losses: 8 },
    { teamId: "t8", name: "H", wins: 3, losses: 9 },
    { teamId: "t9", name: "I", wins: 2, losses: 10 },
    { teamId: "t10", name: "J", wins: 1, losses: 11 },
  ];

  const teamNames = new Map(standings.map((s) => [s.teamId, s.name]));

  it("marks auto, play-in, and out teams by seed", () => {
    const picture = buildPlayoffPicture({
      standings,
      settings: { ...DEFAULT_PLAYOFF_SETTINGS, autoQualifyCount: 6, playInTeamCount: 2 },
      rounds: [],
      games: [],
      teamNames,
    });
    expect(picture.seeds.filter((s) => s.status === "qualified")).toHaveLength(6);
    expect(picture.seeds.filter((s) => s.status === "play-in")).toHaveLength(2);
    expect(picture.seeds.filter((s) => s.status === "out")).toHaveLength(2);
  });

  it("splits play-in and main bracket games by round", () => {
    const rounds = [
      { id: "r1", phase: "playoffs" as const, roundNumber: 1 },
      { id: "r2", phase: "playoffs" as const, roundNumber: 2 },
    ];
    const games = [
      {
        game: {
          id: "g1",
          roundId: "r1",
          slotInRound: 1,
          homeTeamId: "t9",
          awayTeamId: "t10",
          homeScore: 5,
          awayScore: 3,
          playedAt: new Date(),
          statsGameId: "s1",
        },
        round: rounds[0]!,
      },
      {
        game: {
          id: "g2",
          roundId: "r2",
          slotInRound: 1,
          homeTeamId: "t1",
          awayTeamId: "t8",
          homeScore: null,
          awayScore: null,
          playedAt: null,
          statsGameId: null,
        },
        round: rounds[1]!,
      },
    ];

    const picture = buildPlayoffPicture({
      standings,
      settings: DEFAULT_PLAYOFF_SETTINGS,
      rounds,
      games,
      teamNames,
    });

    expect(picture.playInGames).toHaveLength(1);
    expect(picture.playInGames[0]!.id).toBe("g1");
    expect(picture.mainBracketRounds).toHaveLength(1);
    expect(picture.mainBracketRounds[0]!.roundNumber).toBe(2);
    expect(picture.mainBracketRounds[0]!.games[0]!.id).toBe("g2");
  });
});
