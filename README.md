# Mario Baseball Hub

League management web app for **Mario Superstar Baseball** netplay leagues: seasons, rosters, schedules, standings, playoffs, and stats parsed from uploaded in-game JSON exports.

**Live stack:** Next.js 16 (App Router) · SQLite (Drizzle ORM) · Railway · iron-session auth

---

## Table of contents

- [Features](#features)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Game stats uploads](#game-stats-uploads)
- [Testing](#testing)
- [Deployment (Railway)](#deployment-railway)
- [Staging workflow](#staging-workflow)
- [Site admin](#site-admin)
- [Troubleshooting](#troubleshooting)

---

## Features

| Area | What it does |
|------|----------------|
| **Leagues & seasons** | Multi-league support; seasons with tiebreaker settings and character pools |
| **Teams & rosters** | Manager claim flow, drag/click roster assignment, home stadium selection |
| **Schedule** | Round-robin generation, weekly matchups, box scores after upload |
| **Standings & playoffs** | W-L, runs for/against, configurable tiebreakers; playoff bracket view |
| **Game stats** | Paste decoded MSSB JSON; matches home/away via netplay names + roster overlap |
| **Characters** | Library with search, attributes, hitting/pitching tabs, per-season stats |
| **Stadiums** | Game counts and leaderboards from JSON `StadiumID` |
| **Team pages** | Season batting/pitching, schedule, former-roster section for traded players |
| **Persistence** | SQLite on a Railway volume; league backup export/restore for site admins |

---

## Repository layout

```
MarioBaseball/
├── README.md                 ← you are here
├── package.json              ← root scripts (delegate to web/)
├── railway.toml              ← fallback if Railway root dir is repo root
├── scripts/
│   ├── setup-local.sh        ← one-time local dev setup
│   └── railway-setup.sh      ← interactive Railway deploy helper
├── data/
│   └── game-statistics/      ← sample decoded JSON files (dev bootstrap)
└── web/                      ← Next.js application
    ├── railway.toml          ← preferred Railway config (Root Directory = web)
    ├── nixpacks.toml         ← Node 22 pin
    ├── public/assets/        ← character mugshots, stadium icons
    └── src/
        ├── app/              ← routes (App Router)
        ├── components/       ← UI
        ├── db/               ← schema, seed, migrations (drizzle-kit push)
        ├── domain/           ← pure logic (stats, standings, playoffs)
        ├── lib/              ← queries, auth glue, helpers
        └── server/           ← server actions, persist-game-stats
```

---

## Prerequisites

- **Node.js 20.9+** (22 recommended; matches Railway/Nixpacks)
- **npm** 9+
- Native build tools for `better-sqlite3` (gcc, python3 — usually present on Linux/macOS)

---

## Local development

### Quick start (recommended)

From the repo root:

```bash
npm run setup    # creates web/.env.local, init DB, loads demo league + sample games
npm run dev      # http://localhost:3000
```

Demo login (after bootstrap):

| Field | Value |
|-------|--------|
| Username | `zomsoth` |
| Password | `baseball123` |

### Manual setup

```bash
cd web
cp .env.example .env.local
# Edit SESSION_PASSWORD to a random 32+ character string
npm install
npm run db:init      # push schema + seed character/stadium catalog
npm run db:bootstrap # optional: demo league with sample uploaded games
npm run dev
```

All root-level `npm run …` commands forward to `web/` (see root `package.json`).

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Production | SQLite path, e.g. `file:./data/league.db` (local) or `file:/app/data/league.db` (Railway + volume) |
| `SESSION_PASSWORD` | Production | 32+ char secret for iron-session cookie encryption |
| `SITE_ADMIN_USERNAME` | Optional | Username auto-promoted to site admin on register/login |
| `ADMIN_SETUP_SECRET` | Optional | One-time secret for `/setup-admin` to claim site admin |
| `DISCORD_WEBHOOK_URL` | Optional | Discord webhook; posts game reports, agreed times, and trades to your server |
| `ANTHROPIC_API_KEY` | Optional | Enables the AI news reporter (commissioner-reviewed season recaps) |
| `AI_NEWS_MODEL` | Optional | Claude model for recaps (default `claude-opus-4-8`) |
| `DEV_ADMIN_USERNAME` | Scripts only | Bootstrap script default user (not read by Next.js) |
| `DEV_ADMIN_PASSWORD` | Scripts only | Bootstrap script default password |

Copy `web/.env.example` → `web/.env.local` for local dev.

---

## Database

SQLite file location is resolved from `DATABASE_URL` (see `web/src/db/resolve-db-path.ts`). Default local path: `web/data/league.db`.

| Command | Description |
|---------|-------------|
| `npm run db:init` | Rebuild native module, create `data/`, push schema, seed catalog |
| `npm run db:push` | Apply schema changes (Drizzle push) |
| `npm run db:seed` | Re-seed character/stadium catalog rows |
| `npm run db:bootstrap` | Idempotent demo league + sample game JSON imports |
| `npm run db:backfill` | CLI to backfill character stats for a season |
| `npm run db:studio` | Drizzle Studio (inspect/edit DB) |

On production boot, `npm run start:prod` runs `ensure-database` → `drizzle-kit push` → `seed` → `next start`.

**Schema changes:** edit `web/src/db/schema.ts`, run `npm run db:push` locally, then deploy. Staging first (see below).

---

## Game stats uploads

Managers or league admins paste **decoded** MSSB JSON on a scheduled game. The backend:

1. Parses top-level fields: `GameID`, `Home Player`, `Away Player`, scores, `StadiumID`
2. Matches netplay usernames to team managers (with roster overlap fallback)
3. Persists per-character lines from `Character Game Stats` (including `Team` field `0`/`1`)
4. Stores raw JSON on the game row for re-processing / backfill

Managers should set **Netplay username** on the Account page so uploads match reliably.

Sample files live in `data/game-statistics/decoded.*.json` and are imported by `db:bootstrap`.

**Season admin → Backfill stats** re-parses stored JSON for games missing rows and re-syncs `StadiumID` from JSON.

---

## Testing

```bash
npm run test     # Vitest — domain logic (standings, stats parse, netplay match, etc.)
npm run lint     # ESLint
npm run build    # Production build + TypeScript check
```

Tests live next to domain modules under `web/src/domain/**/*.test.ts`.

---

## Deployment (Railway)

### Production service (branch: `main`)

1. Connect the GitHub repo to Railway.
2. Create a **web** service with:
   - **Root Directory:** `web`
   - **Config file path:** `/web/railway.toml`
   - **Branch:** `main`
3. Add a **volume** (project canvas → Ctrl+K → “Volume”, or right-click canvas):
   - Mount path: `/app/data`
4. Set environment variables:

   ```env
   DATABASE_URL=file:/app/data/league.db
   SESSION_PASSWORD=<random 32+ chars>
   SITE_ADMIN_USERNAME=<your username>
   ADMIN_SETUP_SECRET=<random secret for /setup-admin>
   ```

5. Deploy. Startup runs migrations + seed automatically.

Interactive helper (sets vars and triggers deploy):

```bash
npm run setup:railway
```

**Without a volume**, the SQLite file is wiped on every redeploy.

The admin dashboard (`/admin`) shows database path, size, and persistence warnings.

---

## Staging workflow

Use a **staging branch** and a **separate Railway service** so production (`main`) stays stable while you develop and test.

### 1. Create the staging branch

```bash
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

### 2. Add a staging Railway service

Duplicate the production service (or add a second service in the same project):

| Setting | Staging | Production |
|---------|---------|------------|
| Branch | `staging` | `main` |
| Root Directory | `web` | `web` |
| Volume mount | `/app/data` | `/app/data` |
| `DATABASE_URL` | `file:/app/data/league.db` | `file:/app/data/league.db` |
| `SESSION_PASSWORD` | *different secret* | *production secret* |

Use a **separate volume** per service so staging experiments do not touch production data.

Give staging its own public URL (Railway generates one per service).

### 3. Day-to-day development

```bash
git checkout staging
# … make changes …
npm run test
npm run build          # optional local sanity check
git add -A
git commit -m "Describe the change"
git push origin staging
```

Railway deploys staging automatically. Verify on the staging URL.

### 4. Promote to production

When staging looks good:

```bash
git checkout main
git pull origin main
git merge staging          # or open a PR: staging → main on GitHub
git push origin main
```

Production redeploys from `main`. Keep `staging` updated after merges:

```bash
git checkout staging
git merge main
git push origin staging
```

### 5. Hotfixes on production

For urgent production-only fixes:

```bash
git checkout main
# fix, commit, push
git checkout staging
git merge main
git push origin staging
```

### Branch summary

| Branch | Deploys to | Purpose |
|--------|------------|---------|
| `staging` | Staging Railway URL | New features, schema changes, risky work |
| `main` | Production URL | Stable, user-facing |

---

## Site admin

- **`SITE_ADMIN_USERNAME`** — auto site-admin for that account
- **`/setup-admin`** — claim site admin with `ADMIN_SETUP_SECRET` while logged in
- **`/admin`** — manage users, leagues, seasons; database status; league backup export/restore

League-level **admins** (per league) manage seasons, rosters, and schedules inside their league.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Users/leagues gone after deploy | No Railway volume | Add volume at `/app/data`, set `DATABASE_URL=file:/app/data/league.db`, redeploy |
| DB errors / empty site after deploy | `DATABASE_URL` is Postgres/MySQL from a Railway DB plugin | Remove plugin variables; use `file:/app/data/league.db` only |
| Data exists but app looks fresh | Volume mount path ≠ `DATABASE_URL` | Check `/admin` → Database persistence; align mount (`/app/data` or `/app/web/data`) with `DATABASE_URL` |
| League/season data lost | Accidental delete or bad deploy | `/admin` → **Automatic database backups** → download `.db` or schedule restore; redeploy applies rollback |

### Data safeguards (production)

- **Auto SQLite snapshots** — before every deploy migration and before league/season delete (`/app/data/backups/`, last 20 kept)
- **League JSON export** — download per-league backup from `/admin` before major changes
- **Delete confirmation** — type exact league/season name; full `.db` backup runs first
- **Foreign keys ON** — league delete cascades intentionally (no orphaned half-deletes)
- **Railway volume** — enable volume snapshots in Railway for an extra safety net
| `no such column: …` locally | Schema ahead of local DB | `npm run db:push` or delete `web/data/league.db` and `npm run db:init` |
| `better-sqlite3` / NODE_MODULE_VERSION error | Node version mismatch | `cd web && npm rebuild better-sqlite3` (use Node 20+ / 22) |
| Wrong home/away on upload | Netplay name mismatch | Set netplay username on Account page; re-upload JSON |
| Empty team stats | Old uploads before team-matching fix | Re-upload affected games or run season backfill |
| Stadium counts wrong | Missing `StadiumID` on old rows | Season admin → Backfill stats |

---

## License

Private project — all rights reserved unless otherwise noted.
