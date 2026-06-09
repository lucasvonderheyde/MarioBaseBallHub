import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/AccountNav";
import { AccountStatsNav, type StatsSection } from "@/components/AccountStatsNav";
import {
  AccountUploadNav,
  type UploadSection,
} from "@/components/AccountUploadNav";
import { BatchGameStatsUploader } from "@/components/BatchGameStatsUploader";
import { BattingStatCells } from "@/components/BattingStatCells";
import { PitchingTableRow, pitchingTableHeaders } from "@/components/PitchingStatCells";
import { CharacterMugshot } from "@/components/CharacterMugshot";
import { GameStatsUploader } from "@/components/GameStatsUploader";
import { ManagerAvatar } from "@/components/ManagerAvatar";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { formatCharIdDisplay } from "@/lib/character-display";
import {
  getManagerHeadToHeadRecords,
  getManagerLifetimeStats,
} from "@/lib/manager-stats";
import { getReportableGamesForUser } from "@/lib/manager-upload-games";
import { updateProfileAction } from "@/server/actions";
import { PageShell } from "@/components/PageShell";

type Tab = "profile" | "stats" | "upload";

function parseTab(value: string | undefined): Tab {
  if (value === "stats") return "stats";
  if (value === "upload") return "upload";
  return "profile";
}

function parseUploadSection(value: string | undefined): UploadSection {
  if (value === "batch") return "batch";
  return "season";
}

function parseStatsSection(value: string | undefined): StatsSection {
  if (value === "characters") return "characters";
  if (value === "h2h") return "h2h";
  return "overview";
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; m?: string; tab?: string; section?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { e, m, tab: tabParam, section: sectionParam } = await searchParams;
  const activeTab = parseTab(tabParam);
  const uploadSection = parseUploadSection(sectionParam);
  const statsSection =
    activeTab === "stats" ? parseStatsSection(sectionParam) : "overview";

  const [lifetime, headToHead, reportableGames] = await Promise.all([
    activeTab === "stats" ? getManagerLifetimeStats(user.id) : null,
    activeTab === "stats" ? getManagerHeadToHeadRecords(user.id) : null,
    activeTab === "upload" ? getReportableGamesForUser(user.id) : null,
  ]);

  return (
    <PageShell width="narrow">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Account</h1>
        <Link href="/leagues" className="text-sm text-zinc-400 hover:text-white">
          Leagues
        </Link>
      </div>

      <AccountNav activeTab={activeTab} />

      {e ? (
        <p className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {e}
        </p>
      ) : null}
      {m === "updated" ? (
        <p className="mt-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Profile updated.
        </p>
      ) : null}

      {activeTab === "profile" ? (
        <>
          <p className="mt-4 text-sm text-zinc-500">
            Update your login username, Rio/netplay name, display name, and manager
            profile picture.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <ManagerAvatar user={user} size={56} />
            <p className="text-sm text-zinc-400">
              Preview of how your avatar appears on team pages.
            </p>
          </div>

          {!userIsSiteAdmin(user) ? (
            <p className="mt-4 text-sm text-zinc-500">
              Need site admin?{" "}
              <Link href="/setup-admin" className="text-amber-400 hover:underline">
                Claim admin access
              </Link>
            </p>
          ) : null}

          <form action={updateProfileAction} className="mt-6 space-y-4">
            <div>
              <label className="text-sm text-zinc-400">Username</label>
              <input
                name="username"
                required
                minLength={2}
                defaultValue={user.username}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
              />
              <p className="mt-1 text-xs text-zinc-600">
                Used to log in and to add you to leagues.
              </p>
            </div>
            <div>
              <label className="text-sm text-zinc-400">Rio / netplay username</label>
              <input
                name="netplayUsername"
                defaultValue={user.netplayUsername ?? ""}
                placeholder="Same name shown in decoded game stats"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
              />
              <p className="mt-1 text-xs text-zinc-600">
                Required to upload game stats — must match Home Player or Away Player
                in your JSON files.
              </p>
            </div>
            <div>
              <label className="text-sm text-zinc-400">Display name</label>
              <input
                name="displayName"
                defaultValue={user.displayName ?? ""}
                placeholder="Optional"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">Profile picture URL</label>
              <input
                name="profilePictureUrl"
                type="url"
                defaultValue={user.profilePictureUrl ?? ""}
                placeholder="https://… (optional)"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
              />
            </div>
            <button type="submit" className="msb-btn-primary w-full py-2">
              Save changes
            </button>
          </form>
        </>
      ) : null}

      {activeTab === "stats" && lifetime && headToHead ? (
        <div className="mt-6 space-y-6">
          <AccountStatsNav activeSection={statsSection} />

          {statsSection === "overview" ? (
            <section>
              <h2 className="text-lg font-semibold">Lifetime hitting</h2>
              <p className="text-sm text-zinc-500">Across all leagues and seasons.</p>
              <div className="msb-table-wrap mt-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
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
              {lifetime.characterBatting.length > 0 ? (
                <p className="mt-4 text-sm text-zinc-500">
                  Used {lifetime.characterBatting.length} character
                  {lifetime.characterBatting.length === 1 ? "" : "s"}.{" "}
                  <Link
                    href="/account?tab=stats&section=characters"
                    className="text-amber-400 hover:underline"
                  >
                    View by character →
                  </Link>
                </p>
              ) : null}
            </section>
          ) : null}

          {statsSection === "characters" ? (
            <div className="space-y-10">
              <section>
                <h2 className="text-lg font-semibold">Hitting by character</h2>
                <p className="text-sm text-zinc-500">
                  Your lifetime batting stats with each character, sorted by plate
                  appearances.
                </p>
                {lifetime.characterBatting.length > 0 ? (
                  <div className="msb-table-wrap mt-3">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                          <th className="py-1 pr-2">Character</th>
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
                        {lifetime.characterBatting.map(({ charId, line }) => (
                          <tr key={charId} className="border-b border-zinc-900">
                            <td className="py-1 pr-2">
                              <span className="flex items-center gap-2">
                                <CharacterMugshot charId={charId} size={24} />
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
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    No hitting stats yet. Report a game to start building your
                    record.
                  </p>
                )}
              </section>

              {lifetime.characterPitching.length > 0 ? (
                <section>
                  <h2 className="text-lg font-semibold">Pitching by character</h2>
                  <p className="text-sm text-zinc-500">
                    Lifetime pitching appearances, sorted by innings pitched.
                  </p>
                  <div className="msb-table-wrap mt-3">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                          <th className="py-1 pr-2">Character</th>
                          {pitchingTableHeaders}
                        </tr>
                      </thead>
                      <tbody>
                        {lifetime.characterPitching.map(({ charId, line }) => (
                          <tr key={charId} className="border-b border-zinc-900">
                            <td className="py-1 pr-2">
                              <span className="flex items-center gap-2">
                                <CharacterMugshot charId={charId} size={24} />
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
            </div>
          ) : null}

          {statsSection === "h2h" ? (
            <section>
              <h2 className="text-lg font-semibold">Head-to-head</h2>
              <p className="text-sm text-zinc-500">
                Your record vs every opponent you&apos;ve faced.
              </p>
              <div className="msb-table-wrap mt-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="py-1 pr-2">Opponent</th>
                      <th className="py-1 pr-2">G</th>
                      <th className="py-1 pr-2">W-L</th>
                      <th className="py-1 pr-2">RF</th>
                      <th className="py-1 pr-2">RA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headToHead.length > 0 ? (
                      headToHead.map((row) => (
                        <tr key={row.opponentUserId} className="border-b border-zinc-900">
                          <td className="py-1 pr-2">
                            {row.opponentDisplayName ?? row.opponentUsername}
                          </td>
                          <td className="py-1 pr-2 tabular-nums">{row.games}</td>
                          <td className="py-1 pr-2 tabular-nums">
                            {row.wins}-{row.losses}
                          </td>
                          <td className="py-1 pr-2 tabular-nums">{row.runsFor}</td>
                          <td className="py-1 pr-2 tabular-nums">{row.runsAgainst}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-zinc-900 text-zinc-500">
                        <td className="py-1 pr-2" colSpan={5}>
                          No completed games yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "upload" && reportableGames ? (
        <div className="mt-6 space-y-6">
          <AccountUploadNav activeSection={uploadSection} />

          {uploadSection === "season" ? (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Unreported season games</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Pick the exact matchup below and upload its JSON. This updates
                  league standings and counts toward your{" "}
                  <Link href="/account?tab=stats" className="text-amber-400 hover:underline">
                    lifetime stats
                  </Link>
                  .
                </p>
              </div>
              {reportableGames.length > 0 ? (
                <ul className="space-y-4">
                  {reportableGames.map((game) => (
                    <li
                      key={game.gameId}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
                    >
                      <p className="text-sm font-medium">
                        {game.awayTeamName} @ {game.homeTeamName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {game.leagueName} · {game.seasonName}
                      </p>
                      <div className="mt-3">
                        <GameStatsUploader
                          gameId={game.gameId}
                          leagueId={game.leagueId}
                          seasonId={game.seasonId}
                          compact
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">
                  No unreported games right now. Check the schedule when a matchup
                  is ready.
                </p>
              )}
            </section>
          ) : (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Lifetime batch</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Drag and drop friendlies or extra games here. They count toward
                  your{" "}
                  <Link href="/account?tab=stats&section=characters" className="text-amber-400 hover:underline">
                    lifetime stats
                  </Link>{" "}
                  only — not league standings. Each GameID can only be stored once.
                  Use{" "}
                  <Link
                    href="/account?tab=upload&section=season"
                    className="text-amber-400 hover:underline"
                  >
                    Season games
                  </Link>{" "}
                  to report scheduled matchups.
                </p>
              </div>
              <BatchGameStatsUploader />
            </section>
          )}
        </div>
      ) : null}
    </PageShell>
  );
}
