<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repo layout (Mario Baseball Hub)

- `web/` — Next.js app (`npm run dev` from repo root runs `cd web && …`).
- `web/public/assets/characters|stadiums/` — static mugshots and stadium icons (no API route).
- `data/game-statistics/` — sample or exported MSSB JSON (repo root; not under `web/`).
- `web/src/domain/` — pure logic (stats decode, standings, tiebreakers); covered by `npm run test`.
- `web/src/server/actions/` — server actions split by area; re-exported from `actions/index.ts`.
- `web/src/lib/` — app glue (session, auth helper, asset URLs, DB-backed queries like `season-dashboard`).
