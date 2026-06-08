/**
 * Backfill character_game_stats for all seasons (or one season id arg).
 * Run: npm run db:backfill [-- seasonId]
 */
import { eq } from "drizzle-orm";
import { db } from "./index";
import { seasons } from "./schema";
import { backfillCharacterGameStats } from "@/server/persist-game-stats";

async function main() {
  const seasonIdArg = process.argv[2];

  if (seasonIdArg) {
    const count = await backfillCharacterGameStats(seasonIdArg);
    console.log(`Backfilled ${count} game(s) for season ${seasonIdArg}`);
    return;
  }

  const allSeasons = await db.select({ id: seasons.id, name: seasons.name }).from(seasons);
  let total = 0;
  for (const s of allSeasons) {
    const count = await backfillCharacterGameStats(s.id);
    if (count > 0) console.log(`${s.name}: ${count} game(s)`);
    total += count;
  }
  console.log(`Total backfilled: ${total} game(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
