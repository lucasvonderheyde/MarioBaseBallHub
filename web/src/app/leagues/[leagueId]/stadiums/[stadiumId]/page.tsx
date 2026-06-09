import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { STADIUM_CATALOG } from "@/data/character-catalog";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import { formatRate } from "@/domain/stats/batting-metrics";
import { getCurrentUser } from "@/lib/auth";
import { formatCharIdDisplay, slugToCharId } from "@/lib/character-display";
import { getLeagueRole } from "@/lib/league-access";
import {
  getPlayerStadiumRecords,
  getTopCharsAtStadium,
} from "@/lib/game-stats-queries";
import { stadiumIdsMatch } from "@/domain/stats/stadium-id";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { stadiumIconUrl } from "@/lib/asset-urls";
import { PageShell } from "@/components/PageShell";

type Props = {
  params: Promise<{ leagueId: string; stadiumId: string }>;
  searchParams: Promise<{ season?: string }>;
};

export default async function StadiumDetailPage({ params, searchParams }: Props) {
  const { leagueId, stadiumId: stadiumSlug } = await params;
  const { season: seasonId } = await searchParams;
  const stadiumId = slugToCharId(stadiumSlug);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await getLeagueRole(leagueId, user);
  if (!role) notFound();

  const catalog = STADIUM_CATALOG.find((s) => s.gameStadiumId === stadiumId);
  if (!catalog) notFound();

  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));

  const relevantSeasons = seasonId
    ? seasonRows.filter((s) => s.id === seasonId)
    : seasonRows;

  type GameRow = {
    gameId: string;
    seasonId: string;
    seasonName: string;
    playedAt: Date | null;
    awayName: string;
    homeName: string;
    awayScore: number | null;
    homeScore: number | null;
  };
  const gameList: GameRow[] = [];

  for (const season of relevantSeasons) {
    const dash = await getSeasonDashboard(season.id);
    if (!dash) continue;
    const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));
    for (const { game } of dash.games) {
      if (!stadiumIdsMatch(game.statsStadiumId, stadiumId) || !game.statsRawJson) continue;
      gameList.push({
        gameId: game.id,
        seasonId: season.id,
        seasonName: season.name,
        playedAt: game.playedAt,
        awayName: teamNames.get(game.awayTeamId) ?? "?",
        homeName: teamNames.get(game.homeTeamId) ?? "?",
        awayScore: game.awayScore,
        homeScore: game.homeScore,
      });
    }
  }
  gameList.sort(
    (a, b) => (b.playedAt?.getTime() ?? 0) - (a.playedAt?.getTime() ?? 0),
  );

  const topChars = await getTopCharsAtStadium(
    stadiumId,
    leagueId,
    seasonId || undefined,
  );
  const playerRecords = await getPlayerStadiumRecords(
    stadiumId,
    leagueId,
    seasonId || undefined,
  );

  return (
    <PageShell width="wide">
      <Link
        href={`/leagues/${leagueId}/stadiums${seasonId ? `?season=${seasonId}` : ""}`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← Stadiums
      </Link>
      <div className="mt-4 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={stadiumIconUrl(catalog.iconFile)}
          alt=""
          width={80}
          height={80}
          className="rounded-lg"
        />
        <h1 className="text-2xl font-bold">{stadiumId}</h1>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Games at this stadium</h2>
        <div className="msb-table-wrap">
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-1 pr-2">Date</th>
              <th className="py-1 pr-2">Matchup</th>
              <th className="py-1 pr-2">Score</th>
              <th className="py-1 pr-2">Season</th>
            </tr>
          </thead>
          <tbody>
            {gameList.map((g) => (
              <tr key={g.gameId} className="border-b border-zinc-900">
                <td className="py-1 pr-2 text-zinc-400">
                  {g.playedAt?.toLocaleDateString() ?? "—"}
                </td>
                <td className="py-1 pr-2">
                  {g.awayName} @ {g.homeName}
                </td>
                <td className="py-1 pr-2 tabular-nums">
                  {g.awayScore != null && g.homeScore != null
                    ? `${g.awayScore}–${g.homeScore}`
                    : "—"}
                </td>
                <td className="py-1 pr-2">
                  <Link
                    href={`/leagues/${leagueId}/seasons/${g.seasonId}/games/${g.gameId}`}
                    className="text-amber-400 hover:underline"
                  >
                    {g.seasonName}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {gameList.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No games recorded here yet.</p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Top characters (5+ AB)</h2>
        <div className="msb-table-wrap">
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-1 pr-2">Character</th>
              <th className="py-1 pr-2">AB</th>
              <th className="py-1 pr-2">AVG</th>
              <th className="py-1 pr-2">HR</th>
              <th className="py-1 pr-2">RBI</th>
              <th className="py-1 pr-2">SLG</th>
            </tr>
          </thead>
          <tbody>
            {topChars.map(({ charId, line }) => (
              <tr key={charId} className="border-b border-zinc-900">
                <td className="py-1 pr-2">
                  <Link
                    href={`/leagues/${leagueId}/characters/${encodeURIComponent(charId)}`}
                    className="flex items-center gap-2 hover:text-amber-400"
                  >
                    <CharacterMugshot charId={charId} size={24} />
                    {formatCharIdDisplay(charId)}
                  </Link>
                </td>
                <td className="py-1 pr-2 tabular-nums">{line.ab}</td>
                <td className="py-1 pr-2 tabular-nums">{formatRate(line.ba)}</td>
                <td className="py-1 pr-2 tabular-nums">{line.hr}</td>
                <td className="py-1 pr-2 tabular-nums">{line.rbi}</td>
                <td className="py-1 pr-2 tabular-nums">{formatRate(line.slg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Manager records</h2>
        <div className="msb-table-wrap">
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-1 pr-2">Manager</th>
              <th className="py-1 pr-2">G</th>
              <th className="py-1 pr-2">RF</th>
              <th className="py-1 pr-2">RA</th>
              <th className="py-1 pr-2">W-L</th>
            </tr>
          </thead>
          <tbody>
            {playerRecords.map((r) => (
              <tr key={r.username} className="border-b border-zinc-900">
                <td className="py-1 pr-2">{r.username}</td>
                <td className="py-1 pr-2 tabular-nums">{r.games}</td>
                <td className="py-1 pr-2 tabular-nums">{r.runsScored}</td>
                <td className="py-1 pr-2 tabular-nums">{r.runsAllowed}</td>
                <td className="py-1 pr-2 tabular-nums">
                  {r.wins}-{r.losses}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </PageShell>
  );
}
