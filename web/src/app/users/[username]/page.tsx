import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { BattingStatCells } from "@/components/BattingStatCells";
import { CharacterIcon } from "@/components/CharacterIcon";
import { ManagerAvatar } from "@/components/ManagerAvatar";
import { PitchingTableRow } from "@/components/PitchingStatCells";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { SectionHeading } from "@/components/SectionHeading";
import {
  battingStatHeaders,
  pitchingStatHeaders,
} from "@/components/stats/stat-table-headers";
import { formatCharIdDisplay } from "@/lib/character-display";
import { getManagerLifetimeStats } from "@/lib/manager-stats";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { username: usernameParam } = await params;
  const username = decodeURIComponent(usernameParam);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!user) notFound();

  const lifetime = await getManagerLifetimeStats(user.id);

  return (
    <PageShell width="default">
      <p className="mb-4 text-center">
        <Link href="/users" className="text-sm text-amber-400 hover:underline">
          ← All users
        </Link>
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <ManagerAvatar user={user} size={72} />
        <div>
          <PageHero
            title={user.displayName ?? user.username}
            subtitle={`@${user.username} · lifetime stats across all leagues and friendlies`}
          />
        </div>
      </div>

      <section className="mt-8 msb-panel p-4 sm:p-6">
        <SectionHeading>Lifetime hitting</SectionHeading>
        <div className="msb-table-wrap mt-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                {battingStatHeaders({ includeG: true, includeObpSlg: true })}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-900">
                <td className="py-1 pr-2 tabular-nums">{lifetime.batting.games}</td>
                <BattingStatCells
                  ab={lifetime.batting.ab}
                  hits={lifetime.batting.hits}
                  hr={lifetime.batting.hr}
                  rbi={lifetime.batting.rbi}
                  walks4ball={lifetime.batting.walks4ball}
                  walksHbp={lifetime.batting.walksHbp}
                  sacFly={lifetime.batting.sacFly}
                  singles={lifetime.batting.singles}
                  doubles={lifetime.batting.doubles}
                  triples={lifetime.batting.triples}
                  showObpSlg
                />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 msb-panel p-4 sm:p-6">
        <SectionHeading>Lifetime pitching</SectionHeading>
        <div className="msb-table-wrap mt-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                {pitchingStatHeaders()}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-900">
                <PitchingTableRow line={lifetime.pitching} />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {lifetime.characterBatting.length > 0 ? (
        <section className="mt-8 msb-panel p-4 sm:p-6">
          <SectionHeading>Hitting by character</SectionHeading>
          <div className="msb-table-wrap mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="py-1 pr-2">Character</th>
                  {battingStatHeaders({ includeG: true, includeObpSlg: true })}
                </tr>
              </thead>
              <tbody>
                {lifetime.characterBatting.map(({ charId, line }) => (
                  <tr key={charId} className="border-b border-zinc-900">
                    <td className="py-1 pr-2">
                      <span className="flex items-center gap-2">
                        <CharacterIcon charId={charId} size={24} />
                        {formatCharIdDisplay(charId)}
                      </span>
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{line.games}</td>
                    <BattingStatCells
                      ab={line.ab}
                      hits={line.hits}
                      hr={line.hr}
                      rbi={line.rbi}
                      walks4ball={line.walks4ball}
                      walksHbp={line.walksHbp}
                      sacFly={line.sacFly}
                      singles={line.singles}
                      doubles={line.doubles}
                      triples={line.triples}
                      showObpSlg
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {lifetime.characterPitching.length > 0 ? (
        <section className="mt-8 msb-panel p-4 sm:p-6">
          <SectionHeading>Pitching by character</SectionHeading>
          <div className="msb-table-wrap mt-4">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="py-1 pr-2">Character</th>
                  {pitchingStatHeaders()}
                </tr>
              </thead>
              <tbody>
                {lifetime.characterPitching.map(({ charId, line }) => (
                  <tr key={charId} className="border-b border-zinc-900">
                    <td className="py-1 pr-2">
                      <span className="flex items-center gap-2">
                        <CharacterIcon charId={charId} size={24} />
                        {formatCharIdDisplay(charId)}
                      </span>
                    </td>
                    <PitchingTableRow line={line} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
