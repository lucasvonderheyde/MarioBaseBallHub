# Mario Baseball Hub — Product Roadmap

Last updated: 2026-06-12  
Repo state: `main` @ `bc46054` (prod + staging online)

This document maps **your requested goals** to **what exists today**, **known bugs**, and **suggested implementation order**. Stretch goals and AI integrations are included with feasibility notes.

---

## Current repo snapshot

### What’s solid today

| Area | Status | Key files |
|------|--------|-----------|
| **Leagues & seasons** | Production-ready | `web/src/app/leagues/`, `web/src/db/schema.ts` |
| **Schedule generation** | Round-robin, weekly matchups | `season-admin-actions.ts`, `domain/schedule/` |
| **Game stats upload** | JSON paste + roster/netplay matching | `server/persist-game-stats.ts`, `domain/stats/match-netplay-teams.ts` |
| **Standings & playoffs** | W-L, tiebreakers, bracket view | `domain/standings/`, `domain/playoffs/` |
| **Season hub** | Recent games, upcoming, standings, records, odds, trades | `app/leagues/.../seasons/[seasonId]/page.tsx` |
| **Team pages** | Batting + pitching tables, schedule, former roster | `teams/[teamId]/page.tsx` |
| **Global characters** | Batting + pitching tabs, comparer, chemistry | `app/characters/` |
| **Draft** | Snake draft, picks, lock on season active | `components/draft/DraftBoard.tsx`, `draft-actions.ts` |
| **Schedule proposals** | Propose / accept / decline datetime | `ScheduleGameRequestActions.tsx`, `manager-requests-actions.ts` |
| **YouTube on games** | Embed + admin URL field | `YouTubeEmbed.tsx`, game page |
| **Trades** | Request / accept flow on season hub | `SeasonTradePanel.tsx`, `trade-requests.ts` |
| **Tier list** | Community aggregate + draggable ballot (v2 ordered) | `tier-list/`, `TierListVotingForm.tsx` |
| **Auth & roles** | Site admin, league commissioner, managers | `lib/auth.ts`, `lib/league-access.ts` |

### Architecture (for planning)

```
Decoded MSSB JSON → parse-character-game-stats → character_game_stats (SQLite)
                                              → schedule_games (scores, sides, raw JSON)
Season context    → roster_instances, teams, schedule, standings, records
Public/global     → aggregate queries in lib/game-stats-queries.ts, global-character-stats.ts
```

---

## Priority 0 — Known bugs (fix before new features)

### P0-1 · Tier list: duplicates / lost characters when reordering within tiers

**Your report:** Dragging within a tier duplicates or removes characters; hard to revise a submission.

**Current state:** Ballots use v2 ordered format (`{ version: 2, tiers: { S: [...], A: [...] } }`). `normalizeBallot()` dedupes on save, but the client drag logic (`TierListVotingForm.tsx`) can desync when:
- Dropping on a tier row vs. on a chip uses different insert indices
- Same-tier reorder index adjustment may be off by one
- No optimistic reload after save — stale server state on revisit

**Files:** `components/tier-list/TierListVotingForm.tsx`, `domain/tier-list/tiers.ts`, `server/actions/tier-list-actions.ts`

**Fix direction:**
1. Unit-test `moveCharacter()` permutations (within-tier, cross-tier, pool ↔ tier)
2. After save, re-fetch ballot or reset state from server response
3. Show full tier list in UI with explicit “edit ballot” mode
4. Add integration test: save → reload → character count unchanged

---

### P0-2 · Season records: wrong team on “most runs” / blowout records

**Your report:** Team scoring records attribute runs to the wrong team.

**Current state:** `topTeamScoreRecord()` and `topBlowoutRecord()` in `lib/season-records.ts` use `scheduleGames.homeTeamId/awayTeamId` + `homeScore/awayScore`. When uploads flip home/away via roster matching, `statsHomeTeamId/statsAwayTeamId` may differ from scheduled IDs.

**Fix direction:** Use stats-side team IDs for attribution; fall back to schedule IDs when stats IDs are null. Add regression test with flipped upload fixture.

**Files:** `lib/season-records.ts`, `domain/stats/match-netplay-teams.ts`

---

### P0-3 · Playoff / clinch percentages need audit

**Your report:** Show historic clinch/playoff race percentages; verify they display correctly.

**Current state:**
- **Championship odds:** `ChampionshipOddsPanel` — power-rating model, not Monte Carlo (`lib/season-odds.ts`, `domain/odds/team-power.ts`)
- **Clinch badges:** Binary labels only (`clinched-playoffs`, `clinched-top-seed`, `clinched-home-field`) via `compute-clinch-status.ts` — simplified math, not true probability
- **Per-game win %:** Shown on schedule cards from `computeGameWinProbability`

**Gap:** No “% to make playoffs” or “% to clinch division” column. Clinch logic may be wrong late-season (doesn’t simulate remaining schedule).

**Fix direction:**
1. Add `playoffProbabilityByTeam` via Monte Carlo over remaining games (reuse standings tiebreakers)
2. Keep championship odds separate (already exists)
3. Document assumptions in UI (“based on X games remaining, Y simulations”)
4. Add golden tests for known standings scenarios

---

## Priority 1 — Your near-term feature goals

### 1 · Reliever stats (starter vs. reliever)

**Goal:** Identify starting pitcher per game, list relievers; show on team page and character pitching views.

**Current state:**
- `wasPitcher` boolean per character per game (from JSON `"Was Pitcher": 1`)
- Sample games show **multiple** `Was Pitcher: 1` entries — flag marks “pitched” not “starter” only
- Pitching aggregates sum all appearances; no GS / GR / W / L / SV / HLD
- Team page has season pitching table; no reliever breakdown per game

**Data available in JSON:** `Was Pitcher`, `Outs Pitched`, roster order, `"Batters Per Position"` — starter likely = first pitcher by inning or highest outs among `Was Pitcher` rows.

**Implementation sketch:**
1. **Domain:** `classifyPitchingRoles(gameStats) → { starter, relievers[] }` per team per game
2. **Persist:** Optional `pitching_role` column on `character_game_stats` (`starter` | `reliever` | `none`)
3. **Queries:** `aggregateReliefStats`, `startersByGame`
4. **UI:** Game box score pitching section; team page “Rotation / Bullpen” split; character page relief line

**Complexity:** Medium — heuristic starter detection needs validation against real box scores.

---

### 2 · Season pitching stats page

**Goal:** League-season view of pitching (like character library but pitching-focused).

**Current state:**
- League character library (`/leagues/[id]/characters`) — **batting only** sorting/display
- Global `/characters?view=pitching` exists as reference pattern
- Team page has pitching table for one team

**Implementation sketch:**
- `/leagues/[leagueId]/characters?view=pitching&season=[id]` or `/leagues/.../seasons/.../pitching`
- Reuse `aggregatePitchingByCharId`, `sort-character-library-pitching.ts`, grid component from global characters
- Split “with stats” / “no pitching stats” like global page

**Complexity:** Low — mostly UI + query wiring.

---

### 3 · Season character snapshot table view

**Goal:** Toggle on season character page to see all characters in one sortable table (main stats + averages).

**Current state:** League character library uses **card grid** (`CharacterLibraryGrid.tsx`), batting only, active/inactive split.

**Implementation sketch:**
- `?view=table` query param
- Shared `CharacterSeasonSnapshotTable` with columns: Name, G, PA, AVG, OBP, SLG, HR, RBI + pitching columns toggle
- Sortable headers (reuse sort libs)

**Complexity:** Low–medium.

---

### 4 · Clickable character links everywhere in a season

**Goal:** Any character mention in season context → character page.

**Current state (partial):**
| Location | Linked? |
|----------|---------|
| Team roster | Yes → `/leagues/.../characters/[charId]?season=` |
| League character library | Yes |
| Game box score player names | **No** — plain text |
| Season records cards | Icon only, **no link** |
| Trade panel | Partial |
| Standings | N/A |

**Implementation sketch:** Shared `<CharacterLink charId seasonId leagueId />` component; audit season routes with grep for `displayName` / `charId` renders.

**Complexity:** Low — high UX impact.

---

### 5 · Scheduling UX improvements

**Goal:**
- Collapse propose-time form into a **“Propose time”** button (expand on click)
- Show only on **your** games (managers in the matchup)
- Add propose button on **team page schedule list** (`W1 · vs X · Scheduled`)

**Current state:**
- `ScheduleGameRequestActions` — always-expanded form on schedule cards for managers
- `SeasonHubUpcomingGames` — already has “Propose time” link to game page (not inline)
- Team schedule list — shows “Scheduled” with no propose action
- Backend: `proposeGameTimeAction` / `respondGameScheduleAction` **work**; needs UX polish + testing

**Implementation sketch:**
1. `CollapsibleScheduleProposal` wrapper with `useState` open/closed
2. Filter: `isUserGameParticipant` (already used)
3. Team page: add button → game page `#schedule` or inline mini-modal
4. E2E test: propose → accept → `agreedPlayAt` set

**Complexity:** Low.

---

### 6 · Schedule status colors

**Goal:** Colors for scheduled / needs scheduling / played.

**Current state:** **Already implemented** on schedule cards:
- `scheduleGameCardStatus()` → `played` | `time_agreed` | `awaiting_time`
- `scheduleGameCardClass()` / `scheduleStatusBadgeClass()` in `league-schedule-ui.tsx`

**Gap:** Team page schedule list uses generic zinc border — **not** status colors. Season hub upcoming list uses muted badges only.

**Implementation sketch:** Reuse `scheduleGameCardStatus` + badge classes on team page and hub lists.

**Complexity:** Low.

---

### 7 · Former roster / traded characters (late uploads)

**Goal:** Characters who left a team (uploaded out of order) show at bottom of team page with link to current team; track manager performance per character across teams.

**Current state:** **Partial**
- `getFormerRosterCharIds()` — heuristic: appeared for team in stats but not on current roster and not in most recent game
- Team page “Former roster” section with batting/pitching totals
- **No** link to character’s current team
- **No** week-by-week schedule awareness for trades
- **No** per-manager career view on character

**Implementation sketch:**
1. Improve detection using **week boundaries** + roster snapshots at time of each game
2. Store `roster_transactions` table (trade, add, drop) for explicit history
3. Character page: “Season teams” timeline
4. Former roster rows: link to `/leagues/.../characters/[id]` + badge for current team

**Complexity:** Medium–high for week-aware logic; medium with explicit trade log.

---

### 8 · Fielding stats

**Goal:** Display fielding if possible.

**Current state:**
- JSON includes position splits: `"Batters Per Position"`, `"Batter Outs Per Position"`, `"Outs Per Position"` per character
- Parser stores `fieldingHand` only — **no fielding counting stats** in DB
- Character ratings have `fieldingArm` (attribute, not game stat)

**Feasibility:** Partial — not traditional PO/A/E/FPCT, but could show:
- Primary position by playing time
- “Chances” / outs recorded per position
- “Big Plays” (already parsed)

**Implementation sketch:** Extend parser → new columns or JSON blob → “Fielding” tab on character/team with derived metrics. Set expectations: MSSB export is limited vs. real fielding lines.

**Complexity:** Medium (data model) + research on JSON semantics.

---

### 9 · League rivalries

**Goal:** Show hottest rivalries in a league.

**Current state:** **Partial**
- `pickRivalryOfWeek()` — algorithmic “Rivalry of the Week” on season hub (standings proximity + playoff implications + upset potential)
- Standings page also surfaces rivalry
- **No** persistent rivalry pairs, all-time H2H rivalry leaderboard, or user-defined rivalries

**Implementation sketch:**
1. **League rivalries page:** Top pairs by combined game count, closest standings, highest avg run differential, recent H2H
2. Optional: commissioner pins rivalry pairs
3. Reuse `head-to-head.ts` aggregation

**Complexity:** Medium.

---

## Priority 2 — Product shape (homepage, feeds, notifications)

### 10 · Notifications center

**Goal:** Account notifications for trades, schedule proposals, etc.; optional Discord push later.

**Current state:** **Not implemented.** No `notifications` table, no in-app inbox. Trade/schedule actions exist but don’t notify.

**Implementation sketch:**
1. `notifications` table: `userId`, `type`, `payload`, `readAt`, `createdAt`
2. Create on: trade request, schedule propose/accept, draft on clock, admin actions
3. `/account/notifications` + bell icon in `Nav.tsx`
4. Phase 2: Discord webhook (see stretch goals)

**Complexity:** Medium.

---

### 11 · League homepage (ESPN-style feed)

**Goal:** League landing = recent games news feed + side stat lines; maybe season feed too.

**Current state:**
- Non-admin `/leagues/[id]` **redirects to active season hub**
- Commissioner sees `CommissionerPanel` only
- Season hub **already has** `SeasonHubRecentGames`, `SeasonActivityFeed`, upcoming games, records — but no league-wide cross-season feed

**Recommendation:**
| Page | Purpose |
|------|---------|
| `/leagues/[id]` | **League home** — cross-season recent results, active season highlight, rivalry, links |
| `/leagues/[id]/seasons/[id]` | **Season home** (current hub) — deepen with “this week” storyline |
| Keep commissioner panel at `/leagues/[id]?tab=...` for admins |

**Complexity:** Medium — mostly composition of existing queries.

---

### 12 · Season feed refinement

**Current state:** `SeasonActivityFeed` + `getRecentSeasonEvents` — game uploads, trades, etc.

**Ideas:**
- “This week” bucket (align with schedule rounds)
- Pin commissioner announcements
- Merge upcoming + recent into single timeline (played above, scheduled below)

**Complexity:** Low–medium.

---

## Priority 3 — Draft & season transitions

### 13 · Live draft with clock

**Goal:** Fantasy-style live draft: login, timer, pick in real time.

**Current state:**
- Snake draft works **async** — manager picks when online, no timer
- `DraftBoard.tsx` — manual refresh after pick (no WebSocket/polling)
- Commissioner starts/locks draft; picks stored in `draft_picks`

**Implementation sketch:**
1. `draft_clock_ends_at` on season or draft state
2. Short-poll or SSE (`/api/draft/[seasonId]/stream`) for pick updates
3. Auto-pick or skip if timer expires (commissioner setting)
4. Full draft board grid UI

**Complexity:** High.

---

### 14 · Draft lottery & new season transition

**Goal:** End-of-season lottery sets draft order; commissioner creates new season, adds teams/managers.

**Current state:**
- Draft order from `draft_order` (manual / initial)
- **No** lottery, weighted standings, or season rollover wizard
- New seasons created in admin; manual team assignment

**Implementation sketch:**
1. `computeLotteryOdds(standings)` — NBA-style weighted balls
2. Lottery reveal UI (optional animation)
3. “Start new season” wizard: clone league settings → new draft pool → invite managers

**Complexity:** High.

---

## Priority 4 — Stretch goals (AI, Discord, automation)

### 15 · AI news bot / storylines

**Goal:** AI reads stat lines, generates league news (team renames, streaks, drama) for feed.

**Current state:** No AI integrations, no LLM dependencies, no news table.

**Prerequisites:** League home feed (#11), event sourcing, API key management.

**Architecture:**
- Trigger on game upload / trade / standings change
- Prompt with structured game summary (no raw PII)
- Store in `league_posts` with `source: ai|human`
- Commissioner approve toggle

**Complexity:** High · **Cost:** API usage per game.

---

### 16 · AI YouTube timestamps

**Goal:** Mark exciting moments in embedded videos from box score.

**Current state:** `youtubeUrl` on game; static embed only.

**Feasibility:** Hard — requires video analysis or manual inning timestamps; box score doesn’t include video timeline offsets.

**Alternative:** Manual timestamp tags (HR inning, big rally) linked to line score; AI suggests timestamps from event list if you add event-level timing later.

**Complexity:** Very high.

---

### 17 · Discord integration

**Goal:** Push notifications to Discord; bot commands for stat lines.

**Current state:** **None** — only “Discord” mentioned in schedule note placeholder.

**Phased approach:**
1. **Webhooks** — post on game upload, trade, schedule accept (easiest)
2. **Bot** — slash commands querying read-only API (`/stats char Mario`, `/standings`)
3. OAuth link Discord user ↔ site user for role pings

**Env:** `DISCORD_WEBHOOK_URL`, `DISCORD_BOT_TOKEN` (server-only).

**Complexity:** Medium (webhooks) → High (bot).

---

### 18 · AI fake ads (character-themed sidebar)

**Goal:** Humorous generated ads (“Petey’s Fertilizer”, “Bloopers Calamari”).

**Current state:** No sidebar ad system, no generative content.

**Implementation sketch:** Cached generative copy per character/team refreshed weekly; static fallback templates without AI for reliability.

**Complexity:** Medium–high · Low priority vs. core stats.

---

### 19 · Automatic game upload from machine

**Goal:** Games auto-upload from local machine without paste.

**Current state:** Manual paste in `GameStatsUploader` / `BatchGameStatsUploader`; sample JSON in `data/game-statistics/`.

**Options:**
| Approach | Notes |
|----------|-------|
| **Watch folder + CLI** | Node script monitors MSSB export dir, POST to API with session token |
| **Desktop tray app** | Electron/Tauri uploader |
| **MSSB mod / plugin** | Only if game supports HTTP export (unlikely) |
| **Browser extension** | Sniff clipboard on decode site |

**Prerequisites:** Authenticated upload API (currently server actions — would need REST endpoint + API keys per manager).

**Complexity:** Very high for true automation; **medium** for folder-watcher CLI.

---

## Additional ideas (not in your list)

1. **Mobile-friendly schedule** — managers live on phones; collapse schedule cards, one-tap propose time.
2. **Push / email digest** — weekly “your games this week” without full Discord.
3. **Play-by-play viewer** — decoded JSON has rich events; inning-by-inning recap page.
4. **WAR / advanced metrics** — league-specific park factors from stadium IDs.
5. **Public embed widgets** — standings iframe for Discord/forum.
6. **Replay integrity** — hash `statsRawJson` on upload to detect edits.
7. **Commissioner audit log** — who cleared stats, who reordered schedule (you hit prod issues here).
8. **Backup hygiene** — auto-prune volume backups, alert when volume >80% (prod lesson learned).
9. **Season awards automation** — auto-nominate league leaders when voting opens.
10. **Character injury / rest tracking** — commissioner notes (roleplay leagues).

---

## Suggested implementation order

```
Phase A — Bugs & trust (1–2 weeks)
  P0-1 tier list drag fixes
  P0-2 records team attribution
  P0-3 playoff probability audit + display
  Schedule UX (#5, #6 team page colors)

Phase B — Stats depth (2–3 weeks)
  #4 character links audit
  #2 season pitching page
  #3 snapshot table view
  #1 reliever classification (starter heuristic)

Phase C — League experience (2–4 weeks)
  #11 league homepage
  #10 notifications inbox
  #7 former roster + trade timeline improvements
  #9 league rivalries page

Phase D — Draft & live (4+ weeks)
  #13 live draft polling + clock
  #14 lottery + season rollover wizard

Phase E — Stretch
  #17 Discord webhooks → bot
  #15 AI news (with moderation)
  #19 folder-watch uploader CLI
  #16/#18 as polish
```

---

## Fielding stats quick answer

**Yes, partially.** The game JSON has per-position defensive usage, not classic fielding lines. We can build *derived* fielding views (primary position, outs by position, big plays). Traditional FPCT/assists/errors are **not** in the export today.

---

## Scheduling quick answer

**Backend works; UX needs your collapsible button + team page entry points.** Test flow: manager A proposes → manager B accepts → `agreedPlayAt` populated → card shows “Time agreed”. Add Vitest/Playwright coverage before calling it done.

---

## Related docs

- [`README.md`](../README.md) — setup, deploy, features table
- [`web/AGENTS.md`](../web/AGENTS.md) — app conventions
- Railway volume / backups — README troubleshooting section
