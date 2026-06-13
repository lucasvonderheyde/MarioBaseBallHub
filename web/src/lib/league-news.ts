import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leaguePosts } from "@/db/schema";

export {
  gameRecapPageHref,
  leaguePostAbsoluteUrl,
  leaguePostPageHref,
} from "@/lib/league-news-links";
/** Drafts are commissioner-only — pass includeDrafts from a server-checked role. */
export async function getSeasonNewsPosts(seasonId: string, includeDrafts: boolean) {
  const rows = await db
    .select()
    .from(leaguePosts)
    .where(eq(leaguePosts.seasonId, seasonId))
    .orderBy(desc(leaguePosts.createdAt))
    .limit(20);
  return includeDrafts ? rows : rows.filter((row) => row.status === "published");
}

export async function findAnyGameRecapPost(gameId: string) {
  const [post] = await db
    .select()
    .from(leaguePosts)
    .where(
      and(
        eq(leaguePosts.relatedGameId, gameId),
        eq(leaguePosts.postType, "game_recap"),
      ),
    )
    .orderBy(desc(leaguePosts.createdAt))
    .limit(1);

  return post ?? null;
}

export async function getGameRecapPost(gameId: string, includeDrafts: boolean) {
  const post = await findAnyGameRecapPost(gameId);
  if (!post) return null;
  if (!includeDrafts && post.status !== "published") return null;
  return post;
}

export async function getLeaguePostById(
  postId: string,
  seasonId: string,
  includeDrafts: boolean,
) {
  const [post] = await db
    .select()
    .from(leaguePosts)
    .where(and(eq(leaguePosts.id, postId), eq(leaguePosts.seasonId, seasonId)))
    .limit(1);

  if (!post) return null;
  if (!includeDrafts && post.status !== "published") return null;
  return post;
}
