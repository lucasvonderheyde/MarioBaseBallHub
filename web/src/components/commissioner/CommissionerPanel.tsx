import Link from "next/link";
import { CopyClaimLinkButton } from "@/components/commissioner/CopyClaimLinkButton";
import { SectionHeading } from "@/components/SectionHeading";
import { RemoveMemberForm } from "@/components/commissioner/RemoveMemberForm";
import type {
  CommissionerMember,
  CommissionerOverview,
  CommissionerSeasonRow,
} from "@/lib/league-commissioner";
import {
  addMemberAction,
  createSeasonAction,
  removeMemberAction,
  renameLeagueAction,
} from "@/server/actions";

export type CommissionerTab = "overview" | "seasons" | "members" | "settings";

const TABS: { id: CommissionerTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "seasons", label: "Seasons" },
  { id: "members", label: "Members" },
  { id: "settings", label: "Settings" },
];

function tabClass(active: boolean): string {
  return active
    ? "border-b-2 border-msb-gold-bright px-3 py-2 text-sm font-medium text-msb-gold-bright"
    : "border-b-2 border-transparent px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300";
}

function seasonStatusClass(status: string): string {
  if (status === "active") return "text-amber-400";
  if (status === "completed") return "text-zinc-500";
  return "text-zinc-400";
}

function cardClass(): string {
  return "rounded-lg border border-zinc-800 bg-zinc-900/40 p-6";
}

type Props = {
  leagueId: string;
  leagueName: string;
  activeTab: CommissionerTab;
  overview: CommissionerOverview;
  seasonRows: CommissionerSeasonRow[];
  members: CommissionerMember[];
  currentUserId: string;
  isSiteAdmin: boolean;
};

export function CommissionerPanel({
  leagueId,
  leagueName,
  activeTab,
  overview,
  seasonRows,
  members,
  currentUserId,
  isSiteAdmin,
}: Props) {
  const claimPath = `/leagues/${leagueId}/claim`;

  return (
    <>
      <nav
        className="mb-8 flex flex-wrap justify-center gap-1 border-b border-zinc-800"
        aria-label="Commissioner sections"
      >
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/leagues/${leagueId}?tab=${tab.id}`}
            className={tabClass(activeTab === tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={cardClass()}>
              <p className="text-sm text-zinc-500">Managers</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">
                {overview.managerCount}
              </p>
            </div>
            <div className={cardClass()}>
              <p className="text-sm text-zinc-500">Active season</p>
              {overview.activeSeason ? (
                <p className="mt-1 text-lg font-semibold text-zinc-100">
                  {overview.activeSeason.name}
                  <span
                    className={`ml-2 text-sm font-normal capitalize ${seasonStatusClass(overview.activeSeason.status)}`}
                  >
                    {overview.activeSeason.status}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-lg text-zinc-500">None</p>
              )}
            </div>
            <div className={cardClass()}>
              <p className="text-sm text-zinc-500">Last game uploaded</p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">
                {overview.lastGameUploadedAt
                  ? overview.lastGameUploadedAt.toLocaleDateString()
                  : "None"}
              </p>
            </div>
          </div>

          {overview.activeSeason ? (
            <div className={`${cardClass()} flex flex-wrap gap-3`}>
              <Link
                href={`/leagues/${leagueId}/seasons/${overview.activeSeason.id}`}
                className="msb-btn-primary px-4 py-2 text-sm"
              >
                Active season hub
              </Link>
              <Link
                href={`/leagues/${leagueId}/seasons/${overview.activeSeason.id}/admin`}
                className="msb-btn-nav px-4 py-2 text-sm"
              >
                Season admin settings
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "seasons" ? (
        <div className="space-y-6">
          <section className={cardClass()}>
            <SectionHeading className="text-zinc-100">Create new season</SectionHeading>
            <form
              action={createSeasonAction.bind(null, leagueId)}
              className="mt-4 flex flex-wrap gap-2"
            >
              <input type="hidden" name="returnTab" value="seasons" />
              <input
                name="name"
                required
                placeholder="Season name"
                className="min-w-[200px] flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
              />
              <button type="submit" className="msb-btn-primary px-4 py-2">
                Create
              </button>
            </form>
          </section>

          <section className={cardClass()}>
            <SectionHeading className="text-zinc-100">All seasons</SectionHeading>
            {seasonRows.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No seasons yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-800">
                {seasonRows.map((season) => (
                  <li key={season.id}>
                    <Link
                      href={`/leagues/${leagueId}/seasons/${season.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-amber-400"
                    >
                      <span className="font-medium text-zinc-100">{season.name}</span>
                      <span className="flex items-center gap-3 text-sm">
                        <span
                          className={`capitalize ${seasonStatusClass(season.status)}`}
                        >
                          {season.status}
                        </span>
                        <span className="text-zinc-500">
                          {season.gameCount} game{season.gameCount === 1 ? "" : "s"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "members" ? (
        <div className="space-y-6">
          <section className={cardClass()}>
            <SectionHeading className="text-zinc-100">League members</SectionHeading>
            {members.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No members yet.</p>
            ) : (
              <div className="msb-table-wrap mt-4">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="py-2 pr-2">Username</th>
                      <th className="py-2 pr-2">Display name</th>
                      <th className="py-2 pr-2">Role</th>
                      <th className="py-2 pr-2">User since</th>
                      <th className="py-2 pr-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.userId} className="border-b border-zinc-900">
                        <td className="py-2 pr-2 font-medium text-zinc-200">
                          {member.username}
                        </td>
                        <td className="py-2 pr-2 text-zinc-400">
                          {member.displayName ?? "—"}
                        </td>
                        <td className="py-2 pr-2 capitalize text-zinc-400">
                          {member.role}
                        </td>
                        <td className="py-2 pr-2 text-zinc-500">
                          {member.userCreatedAt.toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {member.role === "manager" ? (
                            <RemoveMemberForm
                              username={member.username}
                              action={removeMemberAction.bind(
                                null,
                                leagueId,
                                member.userId,
                              )}
                            />
                          ) : member.userId === currentUserId ? (
                            <span className="text-xs text-zinc-600">You</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={cardClass()}>
            <SectionHeading className="text-zinc-100">Add manager</SectionHeading>
            <p className="mt-1 text-sm text-zinc-500">
              User must register first. Adds them as a manager (not an admin).
            </p>
            <form
              action={addMemberAction.bind(null, leagueId)}
              className="mt-4 flex flex-wrap gap-2"
            >
              <input type="hidden" name="returnTab" value="members" />
              <input
                name="username"
                required
                placeholder="Username"
                className="min-w-[200px] flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
              />
              <button
                type="submit"
                className="rounded-md border border-zinc-600 px-4 py-2 text-zinc-200 hover:bg-zinc-800"
              >
                Add to league
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <div className="space-y-6">
          <section className={cardClass()}>
            <SectionHeading className="text-zinc-100">Rename league</SectionHeading>
            <form
              action={renameLeagueAction.bind(null, leagueId)}
              className="mt-4 flex flex-wrap gap-2"
            >
              <input type="hidden" name="returnTab" value="settings" />
              <input
                name="name"
                required
                defaultValue={leagueName}
                className="min-w-[200px] flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
              />
              <button
                type="submit"
                className="rounded-md border border-zinc-600 px-4 py-2 text-zinc-200 hover:bg-zinc-800"
              >
                Save name
              </button>
            </form>
          </section>

          <section className={cardClass()}>
            <SectionHeading className="text-zinc-100">Team claims</SectionHeading>
            <p className="mt-1 text-sm text-zinc-500">
              Send managers this link to register and claim their team.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="break-all font-mono text-xs text-amber-300/90">
                {claimPath}
              </p>
              <CopyClaimLinkButton path={claimPath} />
            </div>
            <Link
              href={claimPath}
              className="mt-3 inline-block text-sm text-amber-400 hover:underline"
            >
              Preview claim page →
            </Link>
          </section>

          <section className={`${cardClass()} border-red-900/40`}>
            <SectionHeading className="text-red-300">Danger zone</SectionHeading>
            <p className="mt-2 text-sm text-zinc-500">
              Deleting a league removes all seasons, teams, and schedules. Uploaded
              stats cannot be recovered from the app.
            </p>
            {isSiteAdmin ? (
              <Link
                href="/admin"
                className="mt-4 inline-block text-sm text-red-400 hover:underline"
              >
                Delete league from site admin →
              </Link>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                Contact your site admin to delete this league.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
