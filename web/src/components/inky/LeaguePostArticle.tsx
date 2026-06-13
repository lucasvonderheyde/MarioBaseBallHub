import Image from "next/image";
import Link from "next/link";
import {
  INKY_BYLINE,
  INKY_DISPLAY_NAME,
  INKY_PROFILE_IMAGE,
} from "@/domain/inky/inky-persona";
import { inkyPostTypeLabel, isInkyPostType } from "@/domain/inky/post-types";
import { gameRecapPageHref } from "@/lib/league-news-links";

type Props = {
  leagueId: string;
  seasonId: string;
  title: string;
  body: string;
  postType: string;
  source: "ai" | "human";
  status: "draft" | "published";
  relatedGameId?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
};

export function LeaguePostArticle({
  leagueId,
  seasonId,
  title,
  body,
  postType,
  source,
  status,
  relatedGameId,
  publishedAt,
  createdAt,
}: Props) {
  const displayDate = publishedAt ?? createdAt;
  const gameHref =
    relatedGameId && (postType === "game_recap" || postType === "preview")
      ? gameRecapPageHref(leagueId, seasonId, relatedGameId)
      : null;

  return (
    <article className="msb-panel p-5 sm:p-8">
      <header className="border-b border-zinc-800/60 pb-6">
        <div className="flex items-start gap-4">
          <Image
            src={INKY_PROFILE_IMAGE}
            alt={INKY_DISPLAY_NAME}
            width={56}
            height={56}
            className="shrink-0 rounded-full border border-zinc-700 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Mushroom Kingdom Morning Star</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-zinc-100 sm:text-3xl">
              {title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {source === "ai" ? <span className="msb-badge-muted">Inky</span> : null}
              {isInkyPostType(postType) ? (
                <span className="rounded-md border border-zinc-700/60 bg-zinc-900/60 px-2 py-0.5 text-zinc-400">
                  {inkyPostTypeLabel(postType)}
                </span>
              ) : null}
              {status === "draft" ? (
                <span className="rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-amber-300">
                  Draft — commissioner review
                </span>
              ) : null}
              <time dateTime={displayDate.toISOString()}>
                {displayDate.toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
            <p className="mt-1 text-xs text-zinc-600">{INKY_BYLINE}</p>
          </div>
        </div>
      </header>

      <div className="prose-invert mt-6 whitespace-pre-line text-base leading-relaxed text-zinc-300">
        {body}
      </div>

      {gameHref ? (
        <p className="mt-8 border-t border-zinc-800/60 pt-4 text-sm">
          <Link href={gameHref} className="text-amber-400 hover:underline">
            View box score and game report →
          </Link>
        </p>
      ) : null}
    </article>
  );
}
