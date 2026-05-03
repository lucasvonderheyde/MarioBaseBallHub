import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const leagues = sqliteTable("leagues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const leagueMembers = sqliteTable(
  "league_members",
  {
    leagueId: text("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "manager"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.leagueId, t.userId] })],
);

export const seasons = sqliteTable("seasons", {
  id: text("id").primaryKey(),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status", { enum: ["setup", "active", "completed"] })
    .notNull()
    .default("setup"),
  /** JSON array: h2h_record | h2h_runs | season_runs | one_game */
  tiebreakerOrder: text("tiebreaker_order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(),
  seasonId: text("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  homeStadiumGameId: text("home_stadium_game_id"),
  managerUserId: text("manager_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  gameCharId: text("game_char_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  mugshotFile: text("mugshot_file"),
});

export const stadiums = sqliteTable("stadiums", {
  id: text("id").primaryKey(),
  gameStadiumId: text("game_stadium_id").notNull().unique(),
  iconFile: text("icon_file"),
});

export const seasonCharacterPool = sqliteTable(
  "season_character_pool",
  {
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    leagueCopies: integer("league_copies").notNull(),
  },
  (t) => [primaryKey({ columns: [t.seasonId, t.characterId] })],
);

export const rosterInstances = sqliteTable(
  "roster_instances",
  {
    id: text("id").primaryKey(),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    copyIndex: integer("copy_index").notNull(),
    teamId: text("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    uniqueIndex("roster_instances_season_char_idx").on(
      t.seasonId,
      t.characterId,
      t.copyIndex,
    ),
  ],
);

export const rounds = sqliteTable(
  "rounds",
  {
    id: text("id").primaryKey(),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    phase: text("phase", { enum: ["regular", "playoffs"] }).notNull(),
    roundNumber: integer("round_number").notNull(),
  },
  (t) => [
    uniqueIndex("rounds_season_phase_num").on(
      t.seasonId,
      t.phase,
      t.roundNumber,
    ),
  ],
);

export const scheduleGames = sqliteTable(
  "schedule_games",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    slotInRound: integer("slot_in_round").notNull(),
    homeTeamId: text("home_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    awayTeamId: text("away_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    youtubeUrl: text("youtube_url"),
    statsGameId: text("stats_game_id").unique(),
    statsRawJson: text("stats_raw_json"),
    playedAt: integer("played_at", { mode: "timestamp" }),
  },
  (t) => [uniqueIndex("schedule_round_slot").on(t.roundId, t.slotInRound)],
);
