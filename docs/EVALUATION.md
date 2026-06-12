# Mario Baseball Hub — Evaluation Report

Date: 2026-06-12 · Branch: `staging` @ `bc46054` · Method: static code analysis + test run (no browser session; items needing runtime verification are flagged).

Test suite status at time of audit: **122/123 passing** (after `npm rebuild better-sqlite3` for Node 24). The one failure is a real test bug, see [Pre-existing issues](#pre-existing-issues).

---

## A. P0 bugs — verified and located

### A1. Tier list drag desync — CONFIRMED

**File:** `web/src/components/tier-list/TierListVotingForm.tsx`

**Root cause — nested drop targets double-fire `moveCharacter`.**
Each `CharacterChip` has its own `onDrop` (lines 253–262 in tier rows, 279–291 in the pool), and it is nested inside a container that *also* has `onDrop` (tier row div, line 242; pool div, line 271). React synthetic drop events bubble. `readDragPayload` (line 164) calls `event.preventDefault()` but never `event.stopPropagation()`.

So dropping onto a chip runs the move **twice**:

1. Chip handler: remove char from `from.index`, insert at the chip's index. Correct.
2. Bubbled container handler: runs again with the **same, now-stale `from` payload** — `splice(from.index, 1)` removes whichever character *currently* sits at that index (a bystander is lost), then the dragged char is inserted again at the row end (a duplicate appears).

This exactly produces the reported "duplicate or lost characters."

**Secondary bugs in `moveCharacter` (lines 123–162):**
- Same-list index adjustment exists for tier→same-tier (lines 148–154) but **not** for pool→pool (line 157 uses `to.index` raw) — reordering within the unranked pool is off by one when dragging forward.
- After save (`submit()`, lines 200–211) the client state is never re-synced with the server's `normalizeBallot()` result, so a desynced ballot stays desynced on screen even though the server deduped it.

**Fix:**
1. Call `event.stopPropagation()` inside `readDragPayload` (one line, kills the double-fire for both tier and pool paths).
2. Add the same-list adjustment for pool→pool.
3. After a successful save, reset state from the server response (return the normalized ballot from `saveTierBallotAction`).
4. Unit-test `moveCharacter` permutations (within-tier, cross-tier, pool↔tier, pool→pool) asserting total character count is invariant. Extract it from the component to make it testable.

**Complexity: small.**

### A2. Records team attribution — REAL BUG FOUND, but not where the report says

**Claim:** `topTeamScoreRecord` / `topBlowoutRecord` use scheduled team IDs instead of stats-side IDs and mis-attribute runs.

**What the code actually does:** there are two orientation contracts in the codebase and they conflict.

- **Storage is schedule-oriented.** `buildMapping` in `web/src/domain/stats/match-netplay-teams.ts` (lines 75–91) re-orients scores before persisting: `scheduleHomeScore` is always the *scheduled home team's* runs, even when the upload flipped sides. `stats-actions.ts:190` writes these into `scheduleGames.homeScore/awayScore`.
- Therefore `lib/season-records.ts` pairing `homeTeamId`+`homeScore` (lines 280–281, 428) is **internally consistent — run attribution and blowout winner are correct** for games uploaded through the current path. Standings (`domain/standings/compute-standings.ts`) and H2H (`lib/head-to-head.ts`) use the same schedule orientation and are also correct.
- **The actual bug is the inverse:** `teamScoresFromFieldSides` in `web/src/domain/stats/resolve-game-field-sides.ts:53` assumes stored scores are **JSON-side-oriented** (its doc comment says so), and the **team page** (`app/leagues/[leagueId]/seasons/[seasonId]/teams/[teamId]/page.tsx:161`) feeds it schedule-oriented DB scores. For every side-flipped game, the team page W/L result and runs are **inverted**. The unit test (`resolve-game-field-sides.test.ts:47–68`) enshrines the wrong contract, so tests pass while production is wrong.

**Two residual record-side issues:**
- Record `detail`/`matchup` strings label away@home by schedule slots (`season-records.ts:301–302` etc.), which misstates who actually had home field in flipped games — cosmetic but confusing.
- Games uploaded **before** the orientation fix (commit `e5d6925`) may have JSON-oriented scores in the DB; `backfillStatsFieldSides` (`lib/stats-field-sides.ts:138`) backfills side IDs but never corrects scores. Legacy rows can genuinely have wrong attribution, which likely explains the original bug report.

**Fix:**
1. Declare one contract: stored scores are schedule-slot-oriented (matches the majority of consumers).
2. Rewrite `teamScoresFromFieldSides` to take the schedule home/away team IDs (or the full game row) and map `ours/theirs` by comparing `teamId` to `game.homeTeamId` — the field sides are only needed for the home/away *label*, not the score mapping. Fix its test fixtures.
3. Extend the backfill to recompute `homeScore/awayScore` from `statsRawJson` + the resolved sides, repairing legacy rows.
4. Regression test: flipped-upload fixture asserting team page result, records attribution, and standings all agree.

**Complexity: medium** (small code change, but needs the backfill + careful consumer audit: `resolveGameFieldSides` consumers are the team page and the game page).

### A3. Playoff clinch math — audited: multiple flaws, no probability model

**File:** `web/src/domain/playoffs/compute-clinch-status.ts`

**Is it correct for the configured tiebreaker order? No — tiebreakers are ignored entirely.**

1. **Ties assumed in the current team's favor** (lines 54–58, 74–80): catching requires `other.wins + otherRemaining > maxWins` (strict). A team that can only *tie* is treated as never catching — but the configured tiebreakers (`domain/standings/tiebreakers.ts`: H2H, run diff, etc.) may favor the trailing team. Clinch badges can show prematurely.
2. **Bogus bound on line 76:** `if (otherIndex > cutoffIndex + remaining) return false;` — it limits which lower-placed teams are considered using the *current team's remaining game count*, two unrelated quantities. Worst case: the leader has 0 games remaining, so only teams at index ≤ `cutoffIndex` are checked, and a team just below the cutoff that can pass `maxWins` is ignored → **false "clinched-playoffs" badge**.
3. **Dead code, lines 65–71:** the `else if` condition (`index === 0 && !teamsBelowCanCatch && higherSeedHomeField`) is a strict subset of the preceding `if`, so the home-field-only branch can never execute.
4. **Fidelity:** the model lets every chaser win out simultaneously even when they play each other — conservative for declaring clinches (acceptable), but combined with bug 2 it's wrong in both directions.

**Is there a "% chance to make playoffs"? No.** Only binary badges. A separate power-rating championship odds panel exists (`lib/season-odds.ts`, `domain/odds/`) — that is *not* playoff probability.

**Data needed for playoff %: already all present.** Standings rows, remaining games (`remainingRegularGames` is already passed in), tiebreaker configuration, and a per-game win-probability model (`computeGameWinProbability` in the odds domain). A Monte Carlo simulation over the remaining schedule (re-using `computeStandings` + tiebreakers per simulated outcome) requires **no schema changes**.

**Complexity: medium** for correct badges; **medium-large** for Monte Carlo playoff %.

---

## B. Schedule UX gaps

**Propose form:** `web/src/components/ScheduleGameRequestActions.tsx` — **always expanded** (form renders unconditionally at line 124; the only state is error/pending). No collapse/expand.

**Team page schedule list:** `teams/[teamId]/page.tsx` ~line 346 renders a plain `Scheduled` label — **no propose button** and no status colors (the `scheduleGameCardStatus`/badge classes from `league-schedule-ui.tsx` are not used here).

**Season hub upcoming games:** `components/season/SeasonHubUpcomingGames.tsx:63–92` — **has** a "Propose time" link for participants, but it links to the game page rather than offering an inline form. Acceptable as an entry point.

**Server actions:** `proposeGameTimeAction` (`server/actions/manager-requests-actions.ts:75`) and `respondGameScheduleAction` (line 143) are complete: `game_schedule_proposals` table with pending/accepted/declined/cancelled status, `agreedPlayAt` set on accept. The flow appears to work end to end in code. **Gap: zero automated test coverage** for these actions, and no notification to the counterparty when a proposal is created or answered (no notifications mechanism exists at all — see F).

**Missing/broken summary:** collapsible propose UI (small), team-page propose entry point (small), status colors on team page + hub lists (small), action test coverage (small), proposal notifications (blocked on F).

---

## C. Stats depth gaps

### C1. Character links — plain-text render locations

| Location | File / line | State |
|---|---|---|
| Box score batting table | `games/[gameId]/page.tsx` ~154–164 | Icon + **plain text name** |
| Box score pitching table | same file ~200–208 | Icon + **plain text name** |
| Season records cards | `components/season/SeasonRecordsPanel.tsx` ~59–66 | Icon + **plain text name** (card links only to box score) |
| Team roster / former roster | linked ✔ | |
| League character library | linked ✔ | |

**Fix:** shared `<CharacterLink charId leagueId seasonId? />` component; apply at the three locations above, then grep-audit remaining `CharacterIcon` usages. **Complexity: small.**

### C2. Season pitching view

**Does not exist.** `/leagues/[leagueId]/characters` is batting-only. The global `/characters?view=pitching` page is the ready-made pattern. All needed columns already exist on `character_game_stats`: `outsPitched`, `battersFaced`, `hitsAllowed`, `runsAllowed`, `earnedRuns`, `strikeoutsDef`, `pitchingWalks`, `battersHit`, `hrAllowed`, `pitchesThrown`, `starPitches`, `bigPlays`. **Complexity: small** (query + UI wiring, reuse `sort-character-library-pitching.ts`).

### C3. Reliever tracking

Sample game (`decoded.20260503T…2372086727.json`): **3 characters with `Was Pitcher: 1`** (under `Defensive Stats`) — i.e., at least one team used a reliever. Only a boolean `wasPitcher` is stored; **no starter/reliever distinction exists anywhere.**

Starter detection options: (a) heuristic — highest `Outs Pitched` per team-side; (b) definitive — the `Events` array records `Pitcher Roster Loc` per event, so the game's first event per half-inning identifies the true starter. Since raw JSON is stored per game, a backfill is possible. **Complexity: medium** (parse + optional `pitching_role` column + UI).

### C4. Fielding data

**Parsed into DB:** `fieldingHand`, `bigPlays` only.
**Available in JSON but unparsed:** `Batters Per Position`, `Batter Outs Per Position`, `Outs Per Position` (per-character position-usage splits), `Stamina`. The `Events` array additionally has per-play fielder/runner detail. Traditional PO/A/E/FPCT does not exist in the export; derived views (primary position, outs recorded per position) are feasible. **Complexity: medium.**

---

## D. Navigation and UX friction

*(Static analysis. A browser walkthrough is still recommended; items marked ⚠ need runtime confirmation.)*

- **No `loading.tsx`, `error.tsx`, or `not-found.tsx` anywhere in `app/`.** Every route blocks navigation on server queries with no skeleton/spinner, and any uncaught server error falls through to Next's default error screen. Adding a handful of route-group `loading.tsx` + a root `error.tsx` is the single biggest perceived-performance win available. **Complexity: small.**
- **Admin gating is correct in the nav:** `/admin` link only renders for site admins (`components/Nav.tsx:66`). No nav links point at admin-only pages for managers.
- **`/leagues/[leagueId]` for non-admins** redirects to the active season (line 68). ⚠ Verify behavior when a league has *no* active season (possible empty/confusing state).
- **Empty states are inconsistent:** the `msb-empty-state` pattern exists but is used in only 7 files; several stat tables/pages render bare headers when no data exists. ⚠ Enumerate per page at runtime.
- **Mobile:** box-score tables use the `msb-table-wrap` scroll container; wide team-page stat tables and the multi-column comparer are the most likely overflow risks. ⚠ Needs device-width pass.

---

## E. Design consistency audit

*(Static counts across `app/` + `components/`.)*

- **Typography drift:**
  - `h1`: 6 variants — `text-2xl font-bold` (8×) is the de-facto standard, but `text-xl font-semibold` (3×), `text-3xl font-bold tracking-tight`, `text-2xl font-semibold` also exist.
  - `h2`: `text-lg font-semibold` dominates (58×) with ~9 one-off variants (`text-xl`, `text-sm uppercase`, color-suffixed duplicates).
  - Recommendation: codify the target scale (h1=`text-2xl`, h2=`text-lg`, body=`text-sm` 80 %, muted=`text-sm` 40 %) in `PageHero`/`Card` and sweep deviations.
- **Cards:** `components/ui/Card.tsx` exists but is imported by only **11 files**; dozens of inline card shells with mixed radii (`rounded-md`/`lg`/`xl`), borders (`border-zinc-800/80` vs `border-zinc-900`) and background opacities (`bg-zinc-950/30`, `/40`, `/60`). Consolidate onto `Card` (or a `msb-card` utility class) incrementally.
- **Buttons:** good primitives exist (`msb-btn-primary` 28×, `msb-btn-nav` 11×) but `msb-btn-outline` (1×) vs `msb-btn-outline-gold` (3×) vs ad-hoc bordered buttons (e.g. `standings/page.tsx:155` `rounded-full border px-3 py-1`) are inconsistent. Pick one outline style.
- **Tailwind class string rendered as visible text:** **none found** via static search. ⚠ If this was observed live, it is likely conditional-render related; re-check in the browser pass.

---

## F. Data model gaps

Schema reviewed: `web/src/db/schema.ts` (22 tables).

| Capability | Status |
|---|---|
| Activity feed | **Exists** — `season_events` (`eventType`, `message`, `relatedGameId`). Limitation: message-string based, **no actor `userId`, no structured payload** — fine for a public feed, insufficient for an audit log or rich filtering. |
| Game time requests | **Exists** — `game_schedule_proposals` is complete (status enum, responder, `agreedPlayAt` on the game row). |
| Trade history | **Partial** — `trade_requests` rows persist accepted trades with offered/requested `roster_instances` IDs, but roster instances *move* teams on accept; there is **no roster snapshot/transaction table**, so "who was on team X in week N" is not reconstructible. |
| Notifications | **Missing entirely** — no table, no mechanism. Needed by schedule proposals, trades, draft clock, award voting. |
| Commissioner audit log | **Missing** — destructive admin actions (clear stats, deletes, backfills) are not attributed/logged (`season_events` has no actor). |

**Decoded JSON fields not parsed at all** (raw JSON is stored on `schedule_games.statsRawJson`, so everything below is backfillable):

- Top-level: `Date - Start`, `Date - End`, `TagSetID`, `Netplay`, `Innings Selected`, `Innings Played`, `Quitter Team`, `Average Ping`, `Lag Spikes`, `Version`. (`Quitter Team` and `Innings Played` are notable — forfeit/mercy detection.)
- Per character: `Stamina`, `Batters Per Position`, `Batter Outs Per Position`, `Outs Per Position`.
- **The entire `Events` array** (~163 events/game): per-event inning, half, score, balls/strikes/outs, star counts, `Chemistry Links on Base`, pitcher/batter/catcher roster locations, `Result of AB`, runner states. This is the play-by-play goldmine.

---

## G. New feature readiness

| Feature | Schema-ready? | What's needed |
|---|---|---|
| 1. Player career page (all-time, cross-league) | **Mostly** | `character_game_stats` keyed by season/team works, but manager attribution relies on `teams.managerUserId` (*current* manager) — a manager change rewrites history. Needs per-game manager snapshot or `roster_transactions`. **Medium.** |
| 2. Character matchup matrix (vs. specific pitchers) | **No** | Aggregates can't answer batter-vs-pitcher; requires parsing `Events` into an `at_bats`/`game_events` table. **Large.** |
| 3. Comeback tracker | **Derivable** | Per-event scores in stored raw JSON; compute max deficit on demand or persist one column per game via backfill. No required schema change, persistence recommended. **Medium.** |
| 4. Manager comparison tool | **Yes** | `lib/head-to-head.ts` already aggregates manager-vs-manager; `/h2h` exists. Pure UI extension (game log, streaks, run diff). **Small.** |
| 5. Play-by-play viewer | **Yes** | Render `Events` from `statsRawJson` server-side per game page; no schema change. **Medium (UI).** |
| 6. Commissioner audit log | **No** | New `audit_log` table (`actorUserId`, `action`, `targetType/Id`, `payload`, `createdAt`) + write calls in admin/stats/season actions. **Small–medium.** |

---

## Pre-existing issues found during audit (not in the brief)

1. **Broken test:** `web/src/db/apply-schema-patches.test.ts` ("adds award_voting_open when missing") creates a fixture DB without `schedule_games`; `applySqliteSchemaPatches` (`apply-schema-patches.ts:16`) unconditionally `PRAGMA`s/`ALTER`s that table → `SqliteError: no such table`. Fix the fixture (or guard the function). Currently 1/123 failing.
2. **`.gitignore` gap:** `web/data/*.db` is ignored but `web/data/backups/*.db` is not — local DB backups (real league data) are one `git add -A` away from being committed. Add `web/data/` or `web/data/backups/`.
3. **Node version drift:** `.nvmrc` pins 22, local shell runs Node 24 — `better-sqlite3` needed a rebuild to run tests. Document or align.
4. **Lint:** 51 problems (8 errors, 43 warnings), mostly unused imports/vars — quick sweep.

---

## Summary

- **P0 bugs confirmed: 3** — A1 exactly as reported (root cause: drop-event bubbling); A2 confirmed but relocated (score-orientation contract conflict in `teamScoresFromFieldSides` + unrepaired legacy rows — the records queries themselves are consistent); A3 confirmed (tiebreakers ignored, one outright logic bug, dead code, no playoff %).
- **UX gaps found: 9** — always-expanded propose form, no team-page propose entry, no status colors on team page/hub lists, no proposal notifications, zero `loading.tsx`/`error.tsx`, sparse empty states, 3 unlinked character-name surfaces, no league pitching view, typography/card/button drift.
- **Schema gaps found: 5** — notifications (missing), audit log/actor (missing), roster/trade history snapshots (partial), unparsed `Events` play-by-play + fielding/stamina/game-meta fields, manager attribution history.

**Top 3 recommended first actions:**

1. **Fix the tier-list double-drop** (`stopPropagation` + pool index fix + post-save resync + `moveCharacter` unit tests). Smallest fix, restores trust in a visible community feature.
2. **Resolve the score-orientation contract** (rewrite `teamScoresFromFieldSides` + its test, repair legacy rows via extended backfill, add a flipped-game regression covering team page, records, standings). This closes A2 *and* the team-page W/L bug in one change.
3. **Correct clinch badges, then add Monte Carlo playoff %** (remove the line-76 bound, integrate tiebreakers for ties, delete dead branch; then simulate remaining schedule reusing `computeStandings` — all data already available).
