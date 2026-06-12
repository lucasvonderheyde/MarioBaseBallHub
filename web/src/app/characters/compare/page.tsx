import { BattingStatCells } from "@/components/BattingStatCells";
import { CharacterAttributesDiff } from "@/components/characters/CharacterAttributesDiff";
import { CharacterComparerSelector } from "@/components/characters/CharacterComparerSelector";
import { CharacterIcon } from "@/components/CharacterIcon";
import { CharacterPitchingSummary } from "@/components/CharacterPitchingSummary";
import { CharacterStatSummary } from "@/components/CharacterStatSummary";
import { GlobalCharactersNav } from "@/components/GlobalCharactersNav";
import { PitchingTableRow } from "@/components/PitchingStatCells";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { getCharacterRatings } from "@/data/character-ratings";
import {
  aggregateGlobalBattingByCharAndSeason,
  aggregateGlobalBattingByCharId,
  aggregateGlobalPitchingByCharAndSeason,
  aggregateGlobalPitchingByCharId,
  getGlobalCharacterByGameCharId,
  getGlobalCharacterCatalog,
} from "@/lib/global-character-stats";
import type { BattingLine, PitchingLine } from "@/lib/game-stats-queries";

type Props = {
  searchParams: Promise<{ a?: string; b?: string }>;
};

function emptyPitchingLine(charId: string): PitchingLine {
  return {
    charId,
    charOccurrenceIndex: 0,
    games: 0,
    outsPitched: 0,
    battersFaced: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walks: 0,
    strikeouts: 0,
    hrAllowed: 0,
    pitchesThrown: 0,
  };
}

function emptyBattingLine(charId: string): BattingLine {
  return {
    charId,
    charOccurrenceIndex: 0,
    games: 0,
    ab: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    walks4ball: 0,
    walksHbp: 0,
    sacFly: 0,
    rbi: 0,
    ba: null,
    obp: null,
    slg: null,
  };
}

export default async function CharacterComparePage({ searchParams }: Props) {
  const { a, b } = await searchParams;
  const catalog = await getGlobalCharacterCatalog();

  const charA = a ? await getGlobalCharacterByGameCharId(a) : null;
  const charB = b ? await getGlobalCharacterByGameCharId(b) : null;

  const [battingA, battingB, pitchingA, pitchingB, seasonBatA, seasonBatB, seasonPitA, seasonPitB] =
    await Promise.all([
      a ? aggregateGlobalBattingByCharId() : Promise.resolve(new Map()),
      b ? aggregateGlobalBattingByCharId() : Promise.resolve(new Map()),
      a ? aggregateGlobalPitchingByCharId() : Promise.resolve(new Map()),
      b ? aggregateGlobalPitchingByCharId() : Promise.resolve(new Map()),
      a ? aggregateGlobalBattingByCharAndSeason(a) : Promise.resolve([]),
      b ? aggregateGlobalBattingByCharAndSeason(b) : Promise.resolve([]),
      a ? aggregateGlobalPitchingByCharAndSeason(a) : Promise.resolve([]),
      b ? aggregateGlobalPitchingByCharAndSeason(b) : Promise.resolve([]),
    ]);

  const lifetimeBatA = a ? (battingA.get(a) ?? emptyBattingLine(a)) : null;
  const lifetimeBatB = b ? (battingB.get(b) ?? emptyBattingLine(b)) : null;
  const lifetimePitA = a ? (pitchingA.get(a) ?? emptyPitchingLine(a)) : null;
  const lifetimePitB = b ? (pitchingB.get(b) ?? emptyPitchingLine(b)) : null;

  const ratingsA = a ? getCharacterRatings(a) : null;
  const ratingsB = b ? getCharacterRatings(b) : null;

  const seasonLabels = [
    ...new Set([
      ...seasonBatA.map((row) => row.label),
      ...seasonBatB.map((row) => row.label),
      ...seasonPitA.map((row) => row.label),
      ...seasonPitB.map((row) => row.label),
    ]),
  ];

  const seasonBatMapA = new Map(seasonBatA.map((row) => [row.label, row.line]));
  const seasonBatMapB = new Map(seasonBatB.map((row) => [row.label, row.line]));
  const seasonPitMapA = new Map(seasonPitA.map((row) => [row.label, row.line]));
  const seasonPitMapB = new Map(seasonPitB.map((row) => [row.label, row.line]));

  return (
    <PageShell width="wide">
      <PageHero
        title="Character comparer"
        subtitle="Compare lifetime stats by season and base-game attributes between any two characters."
      />
      <GlobalCharactersNav active="compare" />

      <section className="mt-6 msb-panel p-4 sm:p-5">
        <CharacterComparerSelector
          characters={catalog}
          charAId={a ?? ""}
          charBId={b ?? ""}
        />
      </section>

      {charA && charB && lifetimeBatA && lifetimeBatB && lifetimePitA && lifetimePitB ? (
        <div className="mt-8 space-y-8">
          <section className="msb-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <CharacterIcon charId={charA.gameCharId} size={48} />
                <span className="text-lg font-semibold">{charA.displayName}</span>
              </div>
              <span className="text-zinc-500">vs</span>
              <div className="flex items-center gap-3">
                <CharacterIcon charId={charB.gameCharId} size={48} />
                <span className="text-lg font-semibold">{charB.displayName}</span>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <CharacterStatSummary title={`${charA.displayName} · lifetime hitting`} line={lifetimeBatA} />
              <CharacterStatSummary title={`${charB.displayName} · lifetime hitting`} line={lifetimeBatB} />
              <CharacterPitchingSummary title={`${charA.displayName} · lifetime pitching`} line={lifetimePitA} />
              <CharacterPitchingSummary title={`${charB.displayName} · lifetime pitching`} line={lifetimePitB} />
            </div>
          </section>

          {seasonLabels.length > 0 ? (
            <>
              <section className="msb-panel p-4 sm:p-5">
                <h2 className="text-lg font-semibold">Hitting by season</h2>
                <div className="msb-table-wrap mt-4">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500">
                        <th className="py-1 pr-2">Season</th>
                        <th className="py-1 pr-2">{charA.displayName}</th>
                        <th className="py-1 pr-2">{charB.displayName}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonLabels.map((label) => {
                        const lineA = seasonBatMapA.get(label) ?? emptyBattingLine(charA.gameCharId);
                        const lineB = seasonBatMapB.get(label) ?? emptyBattingLine(charB.gameCharId);
                        return (
                          <tr key={label} className="border-b border-zinc-900 align-top">
                            <td className="py-2 pr-2 text-zinc-400">{label}</td>
                            <td className="py-2 pr-2">
                              <table>
                                <tbody>
                                  <tr>
                                    <td className="py-0.5 pr-2 tabular-nums">{lineA.games}</td>
                                    <BattingStatCells
                                      ab={lineA.ab}
                                      hits={lineA.hits}
                                      hr={lineA.hr}
                                      rbi={lineA.rbi}
                                      walks4ball={lineA.walks4ball}
                                      walksHbp={lineA.walksHbp}
                                      sacFly={lineA.sacFly}
                                      singles={lineA.singles}
                                      doubles={lineA.doubles}
                                      triples={lineA.triples}
                                      showObpSlg
                                    />
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                            <td className="py-2 pr-2">
                              <table>
                                <tbody>
                                  <tr>
                                    <td className="py-0.5 pr-2 tabular-nums">{lineB.games}</td>
                                    <BattingStatCells
                                      ab={lineB.ab}
                                      hits={lineB.hits}
                                      hr={lineB.hr}
                                      rbi={lineB.rbi}
                                      walks4ball={lineB.walks4ball}
                                      walksHbp={lineB.walksHbp}
                                      sacFly={lineB.sacFly}
                                      singles={lineB.singles}
                                      doubles={lineB.doubles}
                                      triples={lineB.triples}
                                      showObpSlg
                                    />
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="msb-panel p-4 sm:p-5">
                <h2 className="text-lg font-semibold">Pitching by season</h2>
                <div className="msb-table-wrap mt-4">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500">
                        <th className="py-1 pr-2">Season</th>
                        <th className="py-1 pr-2">{charA.displayName}</th>
                        <th className="py-1 pr-2">{charB.displayName}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonLabels.map((label) => {
                        const lineA = seasonPitMapA.get(label) ?? emptyPitchingLine(charA.gameCharId);
                        const lineB = seasonPitMapB.get(label) ?? emptyPitchingLine(charB.gameCharId);
                        const hasA = lineA.outsPitched > 0 || lineA.battersFaced > 0;
                        const hasB = lineB.outsPitched > 0 || lineB.battersFaced > 0;
                        if (!hasA && !hasB) return null;
                        return (
                          <tr key={`pit-${label}`} className="border-b border-zinc-900">
                            <td className="py-2 pr-2 text-zinc-400">{label}</td>
                            <td className="py-2 pr-2">
                              {hasA ? (
                                <table>
                                  <tbody>
                                    <tr>
                                      <PitchingTableRow line={lineA} />
                                    </tr>
                                  </tbody>
                                </table>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>
                            <td className="py-2 pr-2">
                              {hasB ? (
                                <table>
                                  <tbody>
                                    <tr>
                                      <PitchingTableRow line={lineB} />
                                    </tr>
                                  </tbody>
                                </table>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}

          {ratingsA && ratingsB ? (
            <CharacterAttributesDiff
              charAName={charA.displayName}
              charBName={charB.displayName}
              ratingsA={ratingsA}
              ratingsB={ratingsB}
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">
          Pick two characters above to compare their stats and attributes.
        </p>
      )}
    </PageShell>
  );
}
