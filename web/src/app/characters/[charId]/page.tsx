import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BattingStatCells } from "@/components/BattingStatCells";
import { CharacterAttributesSection } from "@/components/CharacterAttributesSection";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import { CharacterPitchingSummary } from "@/components/CharacterPitchingSummary";
import { CharacterStatSummary } from "@/components/CharacterStatSummary";
import { PageShell } from "@/components/PageShell";
import { SectionHeading } from "@/components/SectionHeading";
import { battingStatHeaders } from "@/components/stats/stat-table-headers";
import { getCharacterRatings } from "@/data/character-ratings";
import { getCurrentUser } from "@/lib/auth";
import { formatCharIdDisplay, slugToCharId } from "@/lib/character-display";
import {
  aggregateGlobalBattingByCharAndManager,
  aggregateGlobalBattingByCharId,
  aggregateGlobalPitchingByCharId,
  getGlobalCharacterByGameCharId,
} from "@/lib/global-character-stats";
import type { BattingLine, PitchingLine } from "@/lib/game-stats-queries";

type Props = {
  params: Promise<{ charId: string }>;
};

function emptyPitchingLine(charId: string): PitchingLine {
  return {
    charId,
    charOccurrenceIndex: 0,
    games: 0,
    gamesStarted: 0,
    reliefAppearances: 0,
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

export default async function GlobalCharacterDetailPage({ params }: Props) {
  const user = await getCurrentUser();

  const { charId: slug } = await params;
  const gameCharId = slugToCharId(slug);

  const character = await getGlobalCharacterByGameCharId(gameCharId);
  if (!character) notFound();

  const [battingMap, pitchingMap, managerRows] = await Promise.all([
    aggregateGlobalBattingByCharId(),
    aggregateGlobalPitchingByCharId(),
    aggregateGlobalBattingByCharAndManager(gameCharId),
  ]);

  const batting = battingMap.get(gameCharId) ?? emptyBattingLine(gameCharId);
  const pitching = pitchingMap.get(gameCharId) ?? emptyPitchingLine(gameCharId);
  const ratings = getCharacterRatings(gameCharId);

  return (
    <PageShell width="wide">
      <p className="mb-4 text-center">
        <Link href="/characters" className="text-sm text-amber-400 hover:underline">
          ← All-time characters
        </Link>
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <CharacterMugshot charId={gameCharId} size={72} />
        <div>
          <h1 className="text-2xl font-semibold">{character.displayName}</h1>
          <p className="font-mono text-sm text-zinc-500">
            {formatCharIdDisplay(gameCharId)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Lifetime stats across all leagues and friendlies
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <CharacterStatSummary title="Lifetime hitting" line={batting} />
        <CharacterPitchingSummary title="Lifetime pitching" line={pitching} />
      </div>

      {ratings ? (
        <div className="mt-8">
          <CharacterAttributesSection charId={gameCharId} ratings={ratings} />
        </div>
      ) : null}

      <section className="mt-10 msb-panel p-4 sm:p-5">
        <SectionHeading>By manager</SectionHeading>
        <p className="mt-1 text-sm text-zinc-500">
          Who has used this character across every uploaded game.
        </p>
        <div className="msb-table-wrap mt-3">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1 pr-2">Manager</th>
                {battingStatHeaders({ includeG: true, includeObpSlg: true })}
              </tr>
            </thead>
            <tbody>
              {managerRows.length > 0 ? (
                managerRows.map((row) => (
                  <tr key={row.managerUserId} className="border-b border-zinc-900">
                    <td className="py-1 pr-2">{row.username}</td>
                    <td className="py-1 pr-2 tabular-nums">{row.line.games}</td>
                    <BattingStatCells
                      ab={row.line.ab}
                      hits={row.line.hits}
                      hr={row.line.hr}
                      rbi={row.line.rbi}
                      walks4ball={row.line.walks4ball}
                      walksHbp={row.line.walksHbp}
                      sacFly={row.line.sacFly}
                      singles={row.line.singles}
                      doubles={row.line.doubles}
                      triples={row.line.triples}
                      showObpSlg
                    />
                  </tr>
                ))
              ) : (
                <tr className="border-b border-zinc-900 text-zinc-500">
                  <td className="py-2" colSpan={9}>
                    No manager usage recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
