import { HighlightedMatchupCard } from "@/components/matchups/HighlightedMatchupCard";
import type { RivalryOfWeekPick } from "@/domain/odds/rivalry-of-week";

type Props = {
  leagueId: string;
  seasonId: string;
  rivalry: RivalryOfWeekPick;
  awayName: string;
  homeName: string;
};

export function SeasonRivalryOfWeekPanel({
  leagueId,
  seasonId,
  rivalry,
  awayName,
  homeName,
}: Props) {
  const weekLabel =
    rivalry.game.phase === "playoffs"
      ? `Playoff round ${rivalry.weekNumber}`
      : `Week ${rivalry.weekNumber}`;

  return (
    <HighlightedMatchupCard
        headline="Matchup of the week"
        subheadline={weekLabel}
        awayName={awayName}
        homeName={homeName}
        awayWinPct={rivalry.awayWinPct}
        homeWinPct={rivalry.homeWinPct}
        reasons={rivalry.reasons}
        gameHref={`/leagues/${leagueId}/seasons/${seasonId}/games/${rivalry.game.gameId}`}
        variant="featured"
      />
  );
}
