import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters, seasons, teams } from "@/db/schema";
import { BattingStatCells } from "@/components/BattingStatCells";
import { CharacterAttributesSection } from "@/components/CharacterAttributesSection";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import { CharacterStatSummary } from "@/components/CharacterStatSummary";
import { getCharacterRatings } from "@/data/character-ratings";
import { formatRate } from "@/domain/stats/batting-metrics";
import { getCurrentUser } from "@/lib/auth";
import { formatCharIdDisplay, slugToCharId } from "@/lib/character-display";
import { getLeagueRole } from "@/lib/league-access";
import { countPoolSeasonsForChar } from "@/lib/league-characters";
import {
  aggregateBattingByCharAndManager,
  aggregateBattingByCharAndSeason,
  aggregateBattingByCharAndStadium,
  aggregateBattingByCharId,
  getBattingLine,
  getRecentGamesForChar,
  type BattingLine,
} from "@/lib/game-stats-queries";
import { PageShell } from "@/components/PageShell";

type Props = {
  params: Promise<{ leagueId: string; charId: string }>;
  searchParams: Promise<{ season?: string }>;
};

function ManagerStatsTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    managerUserId: string | null;
    username: string | null;
    line: BattingLine;
  }[];
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="msb-table-wrap">
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-1 pr-2">Manager</th>
              <th className="py-1 pr-2">G</th>
              <th className="py-1 pr-2">AB</th>
              <th className="py-1 pr-2">H</th>
              <th className="py-1 pr-2">HR</th>
              <th className="py-1 pr-2">RBI</th>
              <th className="py-1 pr-2">AVG</th>
              <th className="py-1 pr-2">OBP</th>
              <th className="py-1 pr-2">SLG</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.managerUserId ?? "none"} className="border-b border-zinc-900">
                  <td className="py-1 pr-2">{row.username ?? "—"}</td>
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
                <td className="py-1 pr-2">—</td>
                <td className="py-1 pr-2 tabular-nums">0</td>
                <td className="py-1 pr-2 tabular-nums">0</td>
                <td className="py-1 pr-2 tabular-nums">0</td>
                <td className="py-1 pr-2 tabular-nums">0</td>
                <td className="py-1 pr-2 tabular-nums">0</td>
                <td className="py-1 pr-2 tabular-nums">—</td>
                <td className="py-1 pr-2 tabular-nums">—</td>
                <td className="py-1 pr-2 tabular-nums">—</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function CharacterDetailPage({ params, searchParams }: Props) {
  const { leagueId, charId: charSlug } = await params;
  const { season: seasonId } = await searchParams;
  const charId = slugToCharId(charSlug);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();

  const [characterRow] = await db
    .select()
    .from(characters)
    .where(eq(characters.gameCharId, charId))
    .limit(1);
  if (!characterRow) notFound();

  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));
  const selectedSeason = seasonId
    ? seasonRows.find((season) => season.id === seasonId)
    : null;
  if (seasonId && !selectedSeason) notFound();

  const [
    seasonStatsMap,
    allTimeStatsMap,
    byManagerSeason,
    byManagerAllTime,
    bySeason,
    byStadium,
    recent,
    poolSeasonCount,
  ] = await Promise.all([
    seasonId
      ? aggregateBattingByCharId({ leagueId, charId, seasonId })
      : Promise.resolve(new Map()),
    aggregateBattingByCharId({ leagueId, charId }),
    seasonId
      ? aggregateBattingByCharAndManager({ leagueId, charId, seasonId })
      : Promise.resolve([]),
    aggregateBattingByCharAndManager({ leagueId, charId }),
    aggregateBattingByCharAndSeason(charId, leagueId),
    aggregateBattingByCharAndStadium(charId, leagueId, seasonId || undefined),
    getRecentGamesForChar(charId, leagueId, 15),
    countPoolSeasonsForChar(charId, leagueId),
  ]);

  const seasonLine = seasonId ? getBattingLine(seasonStatsMap, charId) : null;
  const allTimeLine = getBattingLine(allTimeStatsMap, charId);
  const ratings = getCharacterRatings(charId);

  const teamNames = new Map<string, string>();
  const seasonTeamRows = await db.select().from(teams);
  for (const team of seasonTeamRows) teamNames.set(team.id, team.name);

  return (
    <PageShell width="wide">
      <Link
        href={`/leagues/${leagueId}/characters${seasonId ? `?season=${seasonId}` : ""}`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Characters
      </Link>
      <div className="mt-4 flex items-start gap-4">
        <CharacterMugshot charId={charId} size={80} className="rounded-lg" />
        <div>
          <h1 className="text-2xl font-bold">{formatCharIdDisplay(charId)}</h1>
          <p className="font-mono text-sm text-zinc-500">{charId}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {bySeason.length} season{bySeason.length === 1 ? "" : "s"} with uploaded
            stats · {poolSeasonCount} season{poolSeasonCount === 1 ? "" : "s"} in
            league pool
          </p>
        </div>
      </div>

      {ratings ? (
        <div className="mt-10">
          <CharacterAttributesSection ratings={ratings} />
        </div>
      ) : null}

      <div className="mt-10 space-y-10">
        {seasonLine && selectedSeason ? (
          <CharacterStatSummary
            title={`${selectedSeason.name} stats`}
            line={seasonLine}
          />
        ) : null}

        <CharacterStatSummary title="All-time league stats" line={allTimeLine} />

        {seasonId && selectedSeason ? (
          <ManagerStatsTable
            title={`By manager (${selectedSeason.name})`}
            rows={byManagerSeason}
          />
        ) : null}

        <ManagerStatsTable title="By manager (all-time)" rows={byManagerAllTime} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">By season</h2>
        <div className="msb-table-wrap">
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1 pr-2">Season</th>
                <th className="py-1 pr-2">G</th>
                <th className="py-1 pr-2">AB</th>
                <th className="py-1 pr-2">H</th>
                <th className="py-1 pr-2">HR</th>
                <th className="py-1 pr-2">RBI</th>
                <th className="py-1 pr-2">AVG</th>
                <th className="py-1 pr-2">OBP</th>
                <th className="py-1 pr-2">SLG</th>
              </tr>
            </thead>
            <tbody>
              {bySeason.length > 0 ? (
                bySeason.map((row) => (
                  <tr key={row.seasonId} className="border-b border-zinc-900">
                    <td className="py-1 pr-2">{row.seasonName}</td>
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
                  <td className="py-1 pr-2">—</td>
                  <td className="py-1 pr-2 tabular-nums">0</td>
                  <td className="py-1 pr-2 tabular-nums">0</td>
                  <td className="py-1 pr-2 tabular-nums">0</td>
                  <td className="py-1 pr-2 tabular-nums">0</td>
                  <td className="py-1 pr-2 tabular-nums">0</td>
                  <td className="py-1 pr-2 tabular-nums">—</td>
                  <td className="py-1 pr-2 tabular-nums">—</td>
                  <td className="py-1 pr-2 tabular-nums">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">By stadium</h2>
        <div className="msb-table-wrap">
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1 pr-2">Stadium</th>
                <th className="py-1 pr-2">G</th>
                <th className="py-1 pr-2">AB</th>
                <th className="py-1 pr-2">AVG</th>
                <th className="py-1 pr-2">HR</th>
                <th className="py-1 pr-2">RBI</th>
                <th className="py-1 pr-2">SLG</th>
              </tr>
            </thead>
            <tbody>
              {byStadium.length > 0 ? (
                byStadium.map((row) => (
                  <tr key={row.stadiumId} className="border-b border-zinc-900">
                    <td className="py-1 pr-2">
                      <Link
                        href={`/leagues/${leagueId}/stadiums/${encodeURIComponent(row.stadiumId)}`}
                        className="text-amber-400 hover:underline"
                      >
                        {row.stadiumId}
                      </Link>
                    </td>
                    <td className="py-1 pr-2 tabular-nums">{row.line.games}</td>
                    <td className="py-1 pr-2 tabular-nums">{row.line.ab}</td>
                    <td className="py-1 pr-2 tabular-nums">{formatRate(row.line.ba)}</td>
                    <td className="py-1 pr-2 tabular-nums">{row.line.hr}</td>
                    <td className="py-1 pr-2 tabular-nums">{row.line.rbi}</td>
                    <td className="py-1 pr-2 tabular-nums">{formatRate(row.line.slg)}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-zinc-900 text-zinc-500">
                  <td className="py-1 pr-2">—</td>
                  <td className="py-1 pr-2 tabular-nums">0</td>
                  <td className="py-1 pr-2 tabular-nums">0</td>
                  <td className="py-1 pr-2 tabular-nums">—</td>
                  <td className="py-1 pr-2 tabular-nums">0</td>
                  <td className="py-1 pr-2 tabular-nums">0</td>
                  <td className="py-1 pr-2 tabular-nums">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent games</h2>
        {recent.length > 0 ? (
          <div className="msb-table-wrap">
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Manager</th>
                  <th className="py-1 pr-2">Line</th>
                  <th className="py-1 pr-2">Game</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(({ game, stat, manager, seasonName }) => {
                  const isHome = stat.teamSide === "Home";
                  const oppId = isHome ? game.awayTeamId : game.homeTeamId;
                  const oppName = teamNames.get(oppId) ?? "?";
                  const ours = isHome ? game.homeScore : game.awayScore;
                  const theirs = isHome ? game.awayScore : game.homeScore;
                  const wl =
                    ours != null && theirs != null
                      ? ours > theirs
                        ? "W"
                        : "L"
                      : "—";
                  return (
                    <tr key={stat.id} className="border-b border-zinc-900">
                      <td className="py-1 pr-2 text-zinc-400">
                        {game.playedAt?.toLocaleDateString() ?? "—"}
                      </td>
                      <td className="py-1 pr-2">{manager?.username ?? "—"}</td>
                      <td className="py-1 pr-2 tabular-nums">
                        {stat.ab}/{stat.hits}/{stat.hr}/{stat.rbi} · {wl} vs {oppName}
                      </td>
                      <td className="py-1 pr-2">
                        <Link
                          href={`/leagues/${leagueId}/seasons/${stat.seasonId}/games/${game.id}`}
                          className="text-amber-400 hover:underline"
                        >
                          Box ({seasonName})
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">No uploaded game stats yet.</p>
        )}
      </section>
    </PageShell>
  );
}
