import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { gameRecapPageHref } from "@/lib/league-news-links";

type ActivityEvent = {
  id: string;
  message: string;
  createdAt: Date;
};

type NewsHeadline = {
  id: string;
  title: string;
  body: string;
  source: "ai" | "human";
  status: "draft" | "published";
  postType: string;
  relatedGameId?: string | null;
  createdAt: Date;
};

type Props = {
  leagueId: string;
  seasonId: string;
  posts: NewsHeadline[];
  events: ActivityEvent[];
};

function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SeasonHubHeadlines({ leagueId, seasonId, posts, events }: Props) {
  const publishedPosts = posts.filter((post) => post.status === "published");
  const hasHeadlines = publishedPosts.length > 0 || events.length > 0;

  if (!hasHeadlines) return null;

  return (
    <>
      {publishedPosts.length > 0 ? (
        <Card title="Top headlines">
          <ul className="space-y-3">
            {publishedPosts.slice(0, 6).map((post) => {
              const gameRecapHref =
                post.postType === "game_recap" && post.relatedGameId
                  ? gameRecapPageHref(leagueId, seasonId, post.relatedGameId)
                  : null;

              return (
              <li key={post.id}>
                <p className="text-xs text-zinc-500">
                  {formatRelativeDate(post.createdAt)}
                  {post.source === "ai" ? (
                    <span className="ml-2 text-zinc-600">· Inky</span>
                  ) : null}
                </p>
                {gameRecapHref ? (
                  <Link
                    href={gameRecapHref}
                    className="mt-0.5 block text-sm font-semibold leading-snug text-zinc-100 hover:text-amber-300"
                  >
                    {post.title}
                  </Link>
                ) : (
                  <p className="mt-0.5 text-sm font-semibold leading-snug text-zinc-100">
                    {post.title}
                  </p>
                )}
                {post.body ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                    {post.body}
                  </p>
                ) : null}
              </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {events.length > 0 ? (
        <Card title="Trending">
          <ul>
            {events.slice(0, 8).map((event) => (
              <li
                key={event.id}
                className="msb-row-divider py-2.5 text-sm leading-snug"
              >
                <p className="font-medium text-zinc-200">{event.message}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatRelativeDate(event.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
