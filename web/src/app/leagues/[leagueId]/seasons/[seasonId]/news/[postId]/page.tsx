import Link from "next/link";
import { notFound } from "next/navigation";
import { LeaguePostArticle } from "@/components/inky/LeaguePostArticle";
import { PageHero } from "@/components/PageHero";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser } from "@/lib/auth";
import { getLeagueRole, isLeagueAdmin } from "@/lib/league-access";
import { getLeaguePostById } from "@/lib/league-news";
import { getSeasonDashboard } from "@/lib/season-dashboard";

type Props = {
  params: Promise<{ leagueId: string; seasonId: string; postId: string }>;
};

export default async function LeaguePostPage({ params }: Props) {
  const { leagueId, seasonId, postId } = await params;
  const user = await getCurrentUser();
  const role = await getLeagueRole(leagueId, user);
  const isAdmin = isLeagueAdmin(role);

  const dash = await getSeasonDashboard(seasonId);
  if (!dash || dash.league.id !== leagueId) notFound();

  const post = await getLeaguePostById(postId, seasonId, isAdmin);
  if (!post) notFound();

  return (
    <PageShell width="narrow">
      <PageHero
        className="mb-5 border-b-zinc-800/40 pb-4"
        eyebrow={dash.league.name}
        title={dash.season.name}
        subtitle="Morning Star"
      >
        <Link href={`/leagues/${leagueId}/seasons/${seasonId}`} className="msb-link text-sm">
          ← Season hub
        </Link>
      </PageHero>

      <LeaguePostArticle
        leagueId={leagueId}
        seasonId={seasonId}
        title={post.title}
        body={post.body}
        postType={post.postType}
        source={post.source}
        status={post.status}
        relatedGameId={post.relatedGameId}
        publishedAt={post.publishedAt}
        createdAt={post.createdAt}
      />
    </PageShell>
  );
}
