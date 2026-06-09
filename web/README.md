# Mario Baseball Hub — web app

The Next.js application lives in this directory. **Full documentation** (local setup, Railway, staging workflow, game uploads, database commands) is in the repo root:

**[../README.md](../README.md)**

## Quick commands

Run from **`web/`** or use root shortcuts (`npm run dev`, etc. from repo root).

```bash
cp .env.example .env.local
npm install
npm run db:init
npm run dev
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server (port 3000) |
| `npm run build` | Production build |
| `npm run start:prod` | Migrate + seed + start (Railway) |
| `npm run test` | Vitest unit tests |
| `npm run db:push` | Apply Drizzle schema to SQLite |
| `npm run db:bootstrap` | Demo league + sample games |

## Railway

Set service **Root Directory** to `web`, config **`/web/railway.toml`**, volume at **`/app/data`**. See root README for staging vs production branches.
