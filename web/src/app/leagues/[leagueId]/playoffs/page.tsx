import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ leagueId: string }>;
  searchParams: Promise<{ season?: string }>;
};

/** @deprecated Use /standings — kept for old links. */
export default async function LeaguePlayoffsRedirect({ params, searchParams }: Props) {
  const { leagueId } = await params;
  const { season } = await searchParams;
  const query = season ? `?season=${season}` : "";
  redirect(`/leagues/${leagueId}/standings${query}`);
}
