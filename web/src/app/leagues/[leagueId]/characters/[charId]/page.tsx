import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { BattingStatCells } from "@/components/BattingStatCells";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import { getCharacterRatings } from "@/data/character-ratings";
import { formatRate } from "@/domain/stats/batting-metrics";
import { getCurrentUser } from "@/lib/auth";
import { formatCharIdDisplay, slugToCharId } from "@/lib/character-display";
import { getLeagueRole } from "@/lib/league-access";
import {
  aggregateBattingByCharAndManager,
  aggregateBattingByCharAndSeason,
  aggregateBattingByCharAndStadium,
  aggregateBattingByCharId,
  getRecentGamesForChar,
} from "@/lib/game-stats-queries";

type Props = {
  params: Promise<{ leagueId: string; charId: string }>;
  searchParams: Promise<{ season?: string }>;
};

export default async function CharacterDetailPage({ params, searchParams }: Props) {
  const { leagueId, charId: charSlug } = await params;
  const { season: seasonId } = await searchParams;
  const charId = slugToCharId(charSlug);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();

  const lifetime = await aggregateBattingByCharId({
    leagueId,
    charId,
    seasonId: seasonId || undefined,
  });
  const line = lifetime.get(charId);
  if (!line) notFound();

  const byManager = await aggregateBattingByCharAndManager({
    leagueId,
    charId,
    seasonId: seasonId || undefined,
  });
  const bySeason = await aggregateBattingByCharAndSeason(charId, leagueId);
  const byStadium = await aggregateBattingByCharAndStadium(
    charId,
    leagueId,
    seasonId || undefined,
  );
  const recent = await getRecentGamesForChar(charId, leagueId, 15);
  const ratings = getCharacterRatings(charId);

  const teamNames = new Map<string, string>();
  const seasonTeamRows = await db.select().from(teams);
  for (const t of seasonTeamRows) teamNames.set(t.id, t.name);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
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
          {line ? (
            <p className="mt-2 text-sm text-zinc-400">
              {line.games} games · {line.ab} AB · {formatRate(line.ba)} AVG ·{" "}
              {line.hr} HR · {line.rbi} RBI · OBP {formatRate(line.obp)} · SLG{" "}
              {formatRate(line.slg)}
            </p>
          ) : null}
        </div>
      </div>

      {ratings ? (
        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="text-lg font-semibold">Ratings & abilities</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-zinc-500">Class</dt>
              <dd>{ratings.characterClass}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Speed</dt>
              <dd>{ratings.speed}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Ability 1</dt>
              <dd>{ratings.ability1 || "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Ability 2</dt>
              <dd>{ratings.ability2 || "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Fastball</dt>
              <dd>{ratings.fastBallSpeed}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Curveball</dt>
              <dd>{ratings.curveBallSpeed}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Fielding arm</dt>
              <dd>{ratings.fieldingArm}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Throwing power</dt>
              <dd>{ratings.throwingPower}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Charge hit</dt>
              <dd>{ratings.chargeHitPower}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Slap hit</dt>
              <dd>{ratings.slapHitPower}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Batting stance</dt>
              <dd>{ratings.battingStance}</dd>
            </div>
            {ratings.extra ? (
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">Extra</dt>
                <dd>{ratings.extra}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">By manager</h2>
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
            {byManager.map((row) => (
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
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">By season</h2>
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
            {bySeason.map((row) => (
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
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">By stadium</h2>
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
            {byStadium.map((row) => (
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
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recent games</h2>
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
      </section>
    </div>
  );
}
