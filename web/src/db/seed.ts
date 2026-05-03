import crypto from "crypto";
import { db } from "./index";
import { characters, stadiums } from "./schema";
import { CHARACTER_CATALOG, STADIUM_CATALOG } from "../data/character-catalog";

async function main() {
  await db
    .insert(characters)
    .values(
      CHARACTER_CATALOG.map((row) => ({
        id: crypto.randomUUID(),
        gameCharId: row.gameCharId,
        displayName: row.displayName,
        mugshotFile: row.mugshotFile,
      })),
    )
    .onConflictDoNothing({ target: characters.gameCharId });

  await db
    .insert(stadiums)
    .values(
      STADIUM_CATALOG.map((row) => ({
        id: crypto.randomUUID(),
        gameStadiumId: row.gameStadiumId,
        iconFile: row.iconFile,
      })),
    )
    .onConflictDoNothing({ target: stadiums.gameStadiumId });

  console.log("Seed complete (characters + stadiums, idempotent).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
