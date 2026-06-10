import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountCharacterSortSelect } from "@/components/AccountCharacterSortSelect";
import { AccountNav } from "@/components/AccountNav";
import { AccountStatsNav, type StatsSection } from "@/components/AccountStatsNav";
import {
  AccountUploadNav,
  type UploadSection,
} from "@/components/AccountUploadNav";
import { BatchGameStatsUploader } from "@/components/BatchGameStatsUploader";
import { BattingStatCells } from "@/components/BattingStatCells";
import {
  battingStatHeaders,
  pitchingStatHeaders,
  teamRecordStatHeaders,
} from "@/components/stats/stat-table-headers";
import { PitchingTableRow } from "@/components/PitchingStatCells";
import { CharacterIcon } from "@/components/CharacterIcon";
import { CharacterIcon } from "@/components/CharacterIcon";
import { GameStatsUploader } from "@/components/GameStatsUploader";
import { ManagerAvatar } from "@/components/ManagerAvatar";
import { getCurrentUser, userIsSiteAdmin } from "@/lib/auth";
import { formatCharIdDisplay } from "@/lib/character-display";
import {
  getManagerHeadToHeadRecords,
  getManagerLifetimeStats,
} from "@/lib/manager-stats";
import {
  MANAGER_BATTING_SORT_OPTIONS,
  MANAGER_PITCHING_SORT_OPTIONS,
  parseManagerBattingSort,
  parseManagerPitchingSort,
  sortManagerCharacterBatting,
  sortManagerCharacterPitching,
} from "@/lib/sort-manager-character-stats";
import { getReportableGamesForUser } from "@/lib/manager-upload-games";
import { passwordPolicyDescription } from "@/lib/password-policy";
import { changePasswordAction, updateProfileAction } from "@/server/actions";
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
  searchParams: Promise<{
    e?: string;
    m?: string;
    tab?: string;
    section?: string;
    batSort?: string;
    pitSort?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { e, m, tab: tabParam, section: sectionParam, batSort, pitSort } =
    await searchParams;
  const activeTab = parseTab(tabParam);
  const uploadSection = parseUploadSection(sectionParam);
  const statsSection =
    activeTab === "stats" ? parseStatsSection(sectionParam) : "overview";

  const [lifetime, headToHead, reportableGames] = await Promise.all([
    activeTab === "stats" ? getManagerLifetimeStats(user.id) : null,
    activeTab === "stats" ? getManagerHeadToHeadRecords(user.id) : null,
    activeTab === "upload" ? getReportableGamesForUser(user.id) : null,
  ]);

  const battingSort = parseManagerBattingSort(batSort);
  const pitchingSort = parseManagerPitchingSort(pitSort);
  const sortedCharacterBatting =
    lifetime != null
      ? sortManagerCharacterBatting(lifetime.characterBatting, battingSort)
      : [];
  const sortedCharacterPitching =
    lifetime != null
      ? sortManagerCharacterPitching(lifetime.characterPitching, pitchingSort)
      : [];

  return (
    <PageShell width={activeTab === "profile" ? "narrow" : "default"}>
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
      {m === "password-updated" ? (
        <p className="mt-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Password updated.
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

          <section className="mt-10 border-t border-zinc-800 pt-8">
            <h2 className="text-lg font-semibold">Change password</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {passwordPolicyDescription()}
            </p>
            <form action={changePasswordAction} className="mt-4 space-y-4">
              <div>
                <label className="text-sm text-zinc-400">Current password</label>
                <input
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400">New password</label>
                <input
                  name="newPassword"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400">Confirm new password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
                />
              </div>
              <button type="submit" className="msb-btn-primary w-full py-2">
                Update password
              </button>
            </form>
          </section>
        </>
      ) : null}

      {activeTab === "stats" && lifetime && headToHead ? (
        <div className="mt-6 space-y-6">
          <AccountStatsNav activeSection={statsSection} />

          {statsSection === "overview" ? (
            <section className="msb-panel p-4 sm:p-6">
              <h2 className="text-xl font-semibold">Lifetime hitting</h2>
              <p className="mt-1 text-sm text-zinc-500 sm:text-base">
                Across all leagues and seasons. G is uploaded games, not plate
                appearances summed across characters.
              </p>
              <div className="msb-table-wrap mt-4">
                <table className="w-full min-w-[36rem] text-left text-sm sm:text-base">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      {battingStatHeaders({
                        className: "py-2 pr-3",
                        includeG: true,
                        includeObpSlg: true,
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-900">
                      <td className="py-2 pr-3 tabular-nums font-medium">
                        {lifetime.batting.games}
                      </td>
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
                        cellClassName="py-2 pr-3 tabular-nums font-medium"
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
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Hitting by character</h2>
                    <p className="text-sm text-zinc-500">
                      Your lifetime batting stats with each character.
                    </p>
                  </div>
                  {lifetime.characterBatting.length > 0 ? (
                    <AccountCharacterSortSelect
                      paramName="batSort"
                      value={battingSort}
                      defaultValue="ab"
                      options={MANAGER_BATTING_SORT_OPTIONS}
                    />
                  ) : null}
                </div>
                {lifetime.characterBatting.length > 0 ? (
                  <div className="msb-table-wrap mt-3">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                          <th className="py-1 pr-2">Character</th>
                          {battingStatHeaders({ includeG: true, includeObpSlg: true })}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCharacterBatting.map(({ charId, line }) => (
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
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    No hitting stats yet. Report a game to start building your
                    record.
                  </p>
                )}
              </section>

              {lifetime.characterPitching.length > 0 ? (
                <section>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">Pitching by character</h2>
                      <p className="text-sm text-zinc-500">
                        Lifetime pitching appearances with each character.
                      </p>
                    </div>
                    <AccountCharacterSortSelect
                      paramName="pitSort"
                      value={pitchingSort}
                      defaultValue="ip"
                      options={MANAGER_PITCHING_SORT_OPTIONS}
                    />
                  </div>
                  <div className="msb-table-wrap mt-3">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                          <th className="py-1 pr-2">Character</th>
                          {pitchingStatHeaders()}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCharacterPitching.map(({ charId, line }) => (
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
                      {teamRecordStatHeaders()}
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
                <h2 className="text-lg font-semibold">Your unreported season games</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Matchups involving your team that still need stats uploaded. Pick
                  the exact game below and upload its JSON. This updates league
                  standings and counts toward your{" "}
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
                  No unreported games for your team right now. Check the schedule
                  when your next matchup is ready.
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
