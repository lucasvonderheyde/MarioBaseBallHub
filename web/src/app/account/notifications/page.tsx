import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser } from "@/lib/auth";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  schedule_proposal: "Schedule",
  schedule_agreed: "Schedule",
  schedule_declined: "Schedule",
  trade_proposal: "Trade",
  trade_accepted: "Trade",
  trade_declined: "Trade",
};

function typeBadgeClass(type: string): string {
  if (type.startsWith("trade")) {
    return "border-emerald-800/50 bg-emerald-950/30 text-emerald-300";
  }
  return "border-sky-700/50 bg-sky-950/40 text-sky-300";
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await listNotifications(user.id);
  // Mark read after loading so this render still highlights what was new.
  await markAllNotificationsRead(user.id);

  return (
    <PageShell>
      <PageHero
        eyebrow="Account"
        title="Notifications"
        subtitle="Schedule proposals, trade offers, and responses from other managers."
        backHref="/account"
        backLabel="Account"
      />

      {rows.length > 0 ? (
        <ul className="mt-8 space-y-2">
          {rows.map((notification) => {
            const isUnread = notification.readAt == null;
            const body = (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs ${typeBadgeClass(notification.type)}`}
                >
                  {TYPE_LABELS[notification.type] ?? "Update"}
                </span>
                <span
                  className={`min-w-0 flex-1 text-sm ${isUnread ? "font-medium text-zinc-100" : "text-zinc-400"}`}
                >
                  {notification.message}
                </span>
                <span className="text-xs text-zinc-600">
                  {notification.createdAt.toLocaleString()}
                </span>
              </div>
            );
            const rowClass = `rounded-lg border px-4 py-3 ${
              isUnread
                ? "border-amber-900/50 bg-amber-950/15"
                : "border-zinc-800 bg-zinc-950/40"
            }`;
            return (
              <li key={notification.id} className={rowClass}>
                {notification.href ? (
                  <Link href={notification.href} className="block hover:opacity-90">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="msb-empty-state mt-8">
          <p className="text-sm text-zinc-500">No notifications yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            You&apos;ll see schedule proposals and trade offers here.
          </p>
        </div>
      )}
    </PageShell>
  );
}
