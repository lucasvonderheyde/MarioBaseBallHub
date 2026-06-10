/**
 * Idempotent dev/demo seed: league, users, teams, schedule, and sample game stats.
 * Run: npm run db:bootstrap (from web/)
 */
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  leagueMembers,
  leagues,
  rounds,
  scheduleGames,
  seasons,
  teams,
  users,
} from "./schema";
import { gameStatisticsSamplesDirectory } from "@/lib/repo-layout";
import { parseDecodedGameFile } from "@/domain/stats/decode-game-file";
import { persistCharacterGameStats } from "@/server/persist-game-stats";

function newUuid(): string {
  return crypto.randomUUID();
}

function slugifyLeagueSegment(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const LEAGUE_NAME = "Mario Baseball Hub Demo";
const SEASON_NAME = "Spring 2026";

const DEV_ADMIN_USERNAME = process.env.DEV_ADMIN_USERNAME ?? "zomsoth";
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD ?? "baseball123";

const SAMPLE_FILE_RE =
  /^decoded\.\d+T\d+_(.+)-Vs-(.+)_(\d+)\.json$/;

async function ensureUser(
  username: string,
  password: string,
  displayName?: string,
  options?: { isSiteAdmin?: boolean },
): Promise<string> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing) {
    if (options?.isSiteAdmin) {
      await db
        .update(users)
        .set({ isSiteAdmin: true })
        .where(eq(users.id, existing.id));
    }
    return existing.id;
  }

  const id = newUuid();
  const hash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    id,
    username,
    passwordHash: hash,
    displayName: displayName ?? username,
    isSiteAdmin: options?.isSiteAdmin ?? false,
  });
  return id;
}

function parseSampleFilename(filename: string): {
  awayPlayer: string;
  homePlayer: string;
  statsGameId: string;
} | null {
  const m = SAMPLE_FILE_RE.exec(filename);
  if (!m) return null;
  return {
    awayPlayer: m[1],
    homePlayer: m[2],
    statsGameId: m[3],
  };
}

async function main() {
  const adminId = await ensureUser(
    DEV_ADMIN_USERNAME,
    DEV_ADMIN_PASSWORD,
    "Zomsoth",
    { isSiteAdmin: true },
  );

  const leagueSlug = slugifyLeagueSegment(LEAGUE_NAME);
  let leagueId: string;
  const [existingLeague] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.slug, leagueSlug))
    .limit(1);

  if (existingLeague) {
    leagueId = existingLeague.id;
    console.log(`League exists: ${LEAGUE_NAME}`);
  } else {
    leagueId = newUuid();
    await db.insert(leagues).values({
      id: leagueId,
      name: LEAGUE_NAME,
      slug: leagueSlug,
    });
    console.log(`Created league: ${LEAGUE_NAME}`);
  }

  await db
    .insert(leagueMembers)
    .values({ leagueId, userId: adminId, role: "admin" })
    .onConflictDoNothing();

  let seasonId: string;
  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.leagueId, leagueId));
  const existingSeason = seasonRows.find((s) => s.name === SEASON_NAME);
  if (existingSeason) {
    seasonId = existingSeason.id;
    console.log(`Season exists: ${SEASON_NAME}`);
  } else {
    seasonId = newUuid();
    await db.insert(seasons).values({
      id: seasonId,
      leagueId,
      name: SEASON_NAME,
      status: "active",
      tiebreakerOrder: JSON.stringify([
        "h2h_record",
        "h2h_runs",
        "season_runs",
        "one_game",
      ]),
    });
    console.log(`Created season: ${SEASON_NAME}`);
  }

  let roundId: string;
  const [existingRound] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.seasonId, seasonId))
    .limit(1);
  if (existingRound) {
    roundId = existingRound.id;
  } else {
    roundId = newUuid();
    await db.insert(rounds).values({
      id: roundId,
      seasonId,
      phase: "regular",
      roundNumber: 1,
    });
  }

  const teamByManager = new Map<string, string>();
  async function ensureTeam(managerUsername: string): Promise<string> {
    const cached = teamByManager.get(managerUsername);
    if (cached) return cached;

    const managerId = await ensureUser(managerUsername, DEV_ADMIN_PASSWORD);
    const seasonTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.seasonId, seasonId));
    const found = seasonTeams.find((t) => t.managerUserId === managerId);

    if (found) {
      teamByManager.set(managerUsername, found.id);
      return found.id;
    }

    const teamId = newUuid();
    await db.insert(teams).values({
      id: teamId,
      seasonId,
      name: `${managerUsername}'s Team`,
      managerUserId: managerId,
      homeStadiumGameId: "Mario Stadium",
    });
    teamByManager.set(managerUsername, teamId);
    return teamId;
  }

  const samplesDir = gameStatisticsSamplesDirectory();
  const files = fs
    .readdirSync(samplesDir)
    .filter((f) => f.startsWith("decoded.") && f.endsWith(".json"))
    .sort();

  let slot = 1;
  let loaded = 0;

  for (const file of files) {
    const meta = parseSampleFilename(file);
    if (!meta) {
      console.warn(`Skipping unrecognized filename: ${file}`);
      continue;
    }

    const jsonText = fs.readFileSync(path.join(samplesDir, file), "utf8");
    const parsed = parseDecodedGameFile(jsonText);

    const [existingByStatsId] = await db
      .select({ id: scheduleGames.id })
      .from(scheduleGames)
      .where(eq(scheduleGames.statsGameId, parsed.statsGameId))
      .limit(1);
    if (existingByStatsId) {
      console.log(`Already loaded: ${file}`);
      continue;
    }

    const awayTeamId = await ensureTeam(meta.awayPlayer);
    const homeTeamId = await ensureTeam(meta.homePlayer);

    const gameId = newUuid();
    await db.insert(scheduleGames).values({
      id: gameId,
      roundId,
      slotInRound: slot++,
      homeTeamId,
      awayTeamId,
      homeScore: parsed.homeScore,
      awayScore: parsed.awayScore,
      statsGameId: parsed.statsGameId,
      statsRawJson: parsed.rawJson,
      statsStadiumId: parsed.stadiumId ?? null,
      statsAwayTeamId: awayTeamId,
      statsHomeTeamId: homeTeamId,
      statsAwayPlayer: parsed.awayPlayer,
      statsHomePlayer: parsed.homePlayer,
      playedAt: new Date(),
    });

    await persistCharacterGameStats({
      gameId,
      seasonId,
      awaySideTeamId: awayTeamId,
      homeSideTeamId: homeTeamId,
      rawJson: parsed.rawJson,
    });

    loaded++;
    console.log(`Loaded game: ${meta.awayPlayer} @ ${meta.homePlayer} (${parsed.statsGameId})`);
  }

  console.log("");
  console.log("Bootstrap complete.");
  console.log(`  Login:  ${DEV_ADMIN_USERNAME} / ${DEV_ADMIN_PASSWORD}`);
  console.log(`  League: ${LEAGUE_NAME}`);
  console.log(`  Games loaded this run: ${loaded}`);
  console.log(`  Open:   http://localhost:3000/login`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
