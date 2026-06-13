import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leaguePosts } from "@/db/schema";

export async function buildInkyMemoryContext(seasonId: string): Promise<string> {
  const rows = await db
    .select({
      title: leaguePosts.title,
      postType: leaguePosts.postType,
      body: leaguePosts.body,
    })
    .from(leaguePosts)
    .where(and(eq(leaguePosts.seasonId, seasonId), eq(leaguePosts.status, "published")))
    .orderBy(desc(leaguePosts.publishedAt))
    .limit(5);

  if (rows.length === 0) return "";

  const lines = [
    "Recently published Morning Star stories (avoid repeating the same jokes or phrasing):",
  ];
  for (const row of rows) {
    const excerpt = row.body.split(/\n\n+/)[0]?.trim().slice(0, 140) ?? "";
    lines.push(
      `- [${row.postType}] "${row.title}"${excerpt ? `: ${excerpt}${excerpt.length >= 140 ? "…" : ""}` : ""}`,
    );
  }
  return lines.join("\n");
}
