import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getSeasonDashboard } from "@/lib/season-dashboard";
import { getRecentSeasonEvents } from "@/lib/season-events";
import { getSeasonRecords } from "@/lib/season-records";

const recapSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export type GeneratedRecap = z.infer<typeof recapSchema>;

export function aiNewsEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Compact, structured summary of the season for the model — no raw JSON dumps. */
async function buildSeasonBrief(seasonId: string): Promise<string | null> {
  const dash = await getSeasonDashboard(seasonId);
  if (!dash) return null;

  const teamNames = new Map(dash.teams.map((t) => [t.team.id, t.team.name]));
  const lines: string[] = [];

  lines.push(`League: ${dash.league.name}`);
  lines.push(`Season: ${dash.season.name} (status: ${dash.season.status})`);

  lines.push("\nStandings (W-L, runs for/against):");
  dash.standings.forEach((row, index) => {
    lines.push(
      `${index + 1}. ${row.name} ${row.wins}-${row.losses} (RF ${row.runsFor}, RA ${row.runsAgainst})`,
    );
  });

  const recentGames = dash.games
    .filter(
      ({ game }) =>
        game.playedAt != null && game.homeScore != null && game.awayScore != null,
    )
    .sort(
      (a, b) => (b.game.playedAt?.getTime() ?? 0) - (a.game.playedAt?.getTime() ?? 0),
    )
    .slice(0, 10);
  if (recentGames.length > 0) {
    lines.push("\nRecent results (most recent first):");
    for (const { game, round } of recentGames) {
      lines.push(
        `${round.phase === "playoffs" ? "Playoffs" : `Week ${round.roundNumber}`}: ` +
          `${teamNames.get(game.awayTeamId) ?? "?"} ${game.awayScore} @ ` +
          `${teamNames.get(game.homeTeamId) ?? "?"} ${game.homeScore}`,
      );
    }
  }

  const records = await getSeasonRecords(seasonId);
  if (records.length > 0) {
    lines.push("\nSeason records:");
    for (const record of records.slice(0, 8)) {
      lines.push(`${record.title}: ${record.valueLabel} — ${record.detail}`);
    }
  }

  const events = await getRecentSeasonEvents(seasonId, 15);
  if (events.length > 0) {
    lines.push("\nRecent league activity:");
    for (const event of events) {
      lines.push(`- ${event.message}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generates a sports-desk style recap of the season's recent action.
 * Requires ANTHROPIC_API_KEY; model overridable via AI_NEWS_MODEL.
 */
export async function generateSeasonRecap(
  seasonId: string,
): Promise<GeneratedRecap | { error: string }> {
  if (!aiNewsEnabled()) {
    return { error: "AI news is not configured. Set ANTHROPIC_API_KEY." };
  }

  const brief = await buildSeasonBrief(seasonId);
  if (!brief) return { error: "Season not found." };

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: process.env.AI_NEWS_MODEL || "claude-opus-4-8",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system:
        "You are the beat reporter for a Mario Superstar Baseball netplay league. " +
        "Write a fun, punchy sports recap of the recent action: lead with the " +
        "biggest storyline, mention standout performances and standings " +
        "implications, and keep a light, playful tone befitting Mario baseball. " +
        "Use only the facts provided — never invent games, stats, or quotes. " +
        "The body should be 2-4 short paragraphs of plain text (no markdown).",
      messages: [
        {
          role: "user",
          content: `Write a league news recap from this season summary:\n\n${brief}`,
        },
      ],
      output_config: { format: zodOutputFormat(recapSchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return { error: "The reporter could not produce a recap. Try again." };
    }
    return response.parsed_output;
  } catch (error) {
    console.error("generateSeasonRecap failed", error);
    return { error: "Recap generation failed. Check the server logs." };
  }
}
