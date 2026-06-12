import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leaguePosts } from "@/db/schema";

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
