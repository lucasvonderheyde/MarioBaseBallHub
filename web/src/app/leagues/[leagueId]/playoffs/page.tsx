import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { PlayoffGameCard } from "@/components/league-schedule-ui";
import { PageHero } from "@/components/PageHero";
import { buildPlayoffPicture } from "@/domain/playoffs/build-playoff-picture";
import { db } from "@/db";
import { leagues } from "@/db/schema";
import {
  parsePlayoffSettings,
  playInEnabled,
} from "@/domain/playoffs/playoff-settings";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, isLeagueAdmin, leagueExists } from "@/lib/league-access";
import {
  getLeaguePlayoffData,
  getLeagueSeasons,
  pickDefaultSeasonId,
} from "@/lib/league-seasons";
import { PageShell } from "@/components/PageShell";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string }>;
};

function seedBadge(status: "qualified" | "play-in" | "out"): string {
  if (status === "qualified") return "Auto";
  if (status === "play-in") return "Play-in";
  return "Out";
}

function seedBadgeClass(status: "qualified" | "play-in" | "out"): string {
  if (status === "qualified") return "bg-emerald-950/60 text-emerald-300";
  if (status === "play-in") return "bg-amber-950/60 text-amber-300";
  return "bg-zinc-900 text-zinc-500";
}

export default async function LeaguePlayoffsPage({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { season: seasonParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!(await leagueExists(leagueId))) notFound();

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) notFound();

  const role = await getLeagueRole(leagueId, user);

  const seasons = await getLeagueSeasons(leagueId);
  if (seasons.length === 0) notFound();

  const seasonId =
    seasonParam && seasons.some((s) => s.id === seasonParam)
      ? seasonParam
      : pickDefaultSeasonId(seasons)!;

  const dash = await getLeaguePlayoffData(leagueId, seasonId);
  if (!dash) notFound();

  const settings = parsePlayoffSettings(dash.season.playoffSettings);
  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));
  const picture = buildPlayoffPicture({
    standings: dash.standings,
    settings,
    rounds: dash.rounds,
    games: dash.games.map(({ game, round }) => ({
      game,
      round,
    })),
    teamNames,
  });

  const selectedSeason = seasons.find((s) => s.id === seasonId)!;
  const showPlayIn = playInEnabled(settings);

  return (
    <PageShell width="wide">
      <PageHero
        eyebrow={league.name}
        title="Playoffs"
        subtitle="Seeding from regular-season standings. Play-in and bracket games come from the playoff schedule."
      >
        {seasons.map((s) => (
          <Link
            key={s.id}
            href={`/leagues/${leagueId}/playoffs?season=${s.id}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              s.id === seasonId
                ? "border-amber-600 bg-amber-950/50 text-amber-200"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {s.name}
            {s.status === "active" ? " · current" : ""}
          </Link>
        ))}
      </PageHero>

      {isLeagueAdmin(role) ? (
        <p className="mt-3 text-xs text-zinc-500">
          Play-in rules are configured in{" "}
          <Link
            href={`/leagues/${leagueId}/seasons/${seasonId}#playoff-settings`}
            className="text-amber-400 hover:underline"
          >
            season settings
          </Link>
          .
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-center text-lg font-semibold">
          {selectedSeason.name} — Seeding
        </h2>
        <p className="text-sm text-zinc-500">
          Top {settings.autoQualifyCount} auto-qualify
          {showPlayIn
            ? ` · Seeds ${settings.autoQualifyCount + 1}–${settings.autoQualifyCount + settings.playInTeamCount} play in for ${settings.playInSpots} spot${settings.playInSpots === 1 ? "" : "s"}`
            : null}
        </p>
        <div className="msb-table-wrap mt-3">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="py-2 pr-2">Seed</th>
              <th className="py-2 pr-2">Team</th>
              <th className="py-2 pr-2">W–L</th>
              <th className="py-2 pr-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {picture.seeds.map((row) => (
              <tr key={row.teamId} className="border-b border-zinc-900">
                <td className="py-2 pr-2 tabular-nums text-zinc-500">{row.seed}</td>
                <td className="py-2 pr-2">
                  <Link
                    href={`/leagues/${leagueId}/seasons/${seasonId}/teams/${row.teamId}`}
                    className="text-amber-400 hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="py-2 pr-2 tabular-nums">
                  {row.wins}–{row.losses}
                </td>
                <td className="py-2 pr-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${seedBadgeClass(row.status)}`}
                  >
                    {seedBadge(row.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      {showPlayIn ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Play-in</h2>
          <p className="text-sm text-zinc-500">
            Playoff schedule round {settings.playInRoundNumber}. Add games on the{" "}
            <Link
              href={`/leagues/${leagueId}/seasons/${seasonId}#schedule`}
              className="text-amber-400 hover:underline"
            >
              season schedule
            </Link>
            .
          </p>
          {picture.playInGames.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No play-in games scheduled yet.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {picture.playInGames.map((game) => (
                <PlayoffGameCard
                  key={game.id}
                  game={game}
                  leagueId={leagueId}
                  seasonId={seasonId}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Main bracket</h2>
        {picture.mainBracketRounds.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No main-bracket playoff games yet. Create playoff rounds on the season
            page after play-in (if any).
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {picture.mainBracketRounds.map(({ roundNumber, games }) => (
              <div key={roundNumber}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                  Round {roundNumber}
                </h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {games.map((game) => (
                    <PlayoffGameCard
                      key={game.id}
                      game={game}
                      leagueId={leagueId}
                      seasonId={seasonId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
