import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { STADIUM_CATALOG } from "@/data/character-catalog";
import { CharacterIcon } from "@/components/CharacterIcon";
import {
  GameMatchupInline,
  winnerTeamNameClass,
  gameWinnerSide,
} from "@/components/games/GameMatchupScore";
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
import {
  stadiumLeaderBattingHeaders,
} from "@/components/stats/stat-table-headers";
import { StatColumnHeader } from "@/components/stats/StatColumnHeader";
import { PageShell } from "@/components/PageShell";
import { SectionHeading } from "@/components/SectionHeading";

type Props = {
  params: Promise<{ leagueId: string; stadiumId: string }>;
  searchParams: Promise<{ season?: string }>;
};

export default async function StadiumDetailPage({ params, searchParams }: Props) {
  const { leagueId, stadiumId: stadiumSlug } = await params;
  const { season: seasonId } = await searchParams;
  const stadiumId = slugToCharId(stadiumSlug);

  const user = await getCurrentUser();

  const role = await getLeagueRole(leagueId, user);

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
        <SectionHeading>Games at this stadium</SectionHeading>
        <div className="msb-table-wrap">
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-1 pr-2">Date</th>
              <th className="py-1 pr-2">Matchup</th>
              <th className="py-1 pr-2">Season</th>
            </tr>
          </thead>
          <tbody>
            {gameList.map((g) => {
              const hasScore = g.awayScore != null && g.homeScore != null;
              const winner =
                hasScore ? gameWinnerSide(g.awayScore!, g.homeScore!) : "tie";
              return (
              <tr key={g.gameId} className="border-b border-zinc-900">
                <td className="py-1 pr-2 text-zinc-400">
                  {g.playedAt?.toLocaleDateString() ?? "—"}
                </td>
                <td className="py-1 pr-2">
                  {hasScore ? (
                    <GameMatchupInline
                      awayName={g.awayName}
                      homeName={g.homeName}
                      awayScore={g.awayScore!}
                      homeScore={g.homeScore!}
                    />
                  ) : (
                    <>
                      <span className={winnerTeamNameClass("away", winner)}>{g.awayName}</span>
                      {" @ "}
                      <span className={winnerTeamNameClass("home", winner)}>{g.homeName}</span>
                    </>
                  )}
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
            );
            })}
          </tbody>
        </table>
        </div>
        {gameList.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No games recorded here yet.</p>
        ) : null}
      </section>

      <section className="mt-10">
        <SectionHeading>Top characters (5+ AB)</SectionHeading>
        <div className="msb-table-wrap">
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-1 pr-2">Character</th>
              {stadiumLeaderBattingHeaders()}
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
                    <CharacterIcon charId={charId} size={24} />
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
        <SectionHeading>Manager records</SectionHeading>
        <div className="msb-table-wrap">
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-1 pr-2">Manager</th>
              <StatColumnHeader abbr="G" className="py-1 pr-2" />
              <StatColumnHeader abbr="RF" className="py-1 pr-2" />
              <StatColumnHeader abbr="RA" className="py-1 pr-2" />
              <StatColumnHeader abbr="W-L" className="py-1 pr-2" />
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
