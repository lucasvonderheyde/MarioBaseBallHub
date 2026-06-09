#!/usr/bin/env bash
# Interactive Railway deploy helper. Requires: railway login (once).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! npx @railway/cli whoami >/dev/null 2>&1; then
  echo "Log in to Railway (browser will open):"
  npx @railway/cli login
fi

cd "$ROOT"

if [[ ! -f .railway/project.json ]] && [[ ! -d .railway ]]; then
  echo "Linking project (create new or select existing)…"
  npx @railway/cli init
fi

SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
ADMIN_SECRET="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"

echo "Setting environment variables…"
npx @railway/cli variables set \
  "DATABASE_URL=file:/app/data/league.db" \
  "SESSION_PASSWORD=${SECRET}" \
  "SITE_ADMIN_USERNAME=zomsoth" \
  "ADMIN_SETUP_SECRET=${ADMIN_SECRET}"

echo ""
echo "Save this admin setup secret — use it at /setup-admin after logging in:"
echo "  ${ADMIN_SECRET}"
echo ""
echo "IMPORTANT — configure once in the Railway dashboard (Settings):"
echo ""
echo "  1. Add a VOLUME mounted at /app/data  (required — without this, all league data"
echo "     is wiped on every redeploy)"
echo "  2. Set DATABASE_URL=file:/app/data/league.db"
echo ""
echo "  Option A (recommended):"
echo "    Root Directory: web"
echo "    Config file path: /web/railway.toml"
echo "    Volume mount: /app/data"
echo ""
echo "  Option B (repo root — uses /railway.toml + /nixpacks.toml):"
echo "    Root Directory: (empty)"
echo "    Volume mount: /app/web/data"
echo "    DATABASE_URL=file:/app/web/data/league.db"
echo ""
echo "  Either way: redeploy after saving settings."
echo "  Latest builds must show nodejs_22 in the Nixpacks setup line."
echo ""
echo "Deploying…"
npx @railway/cli up --detach

echo ""
echo "Deployment triggered. After deploy completes:"
echo "  npx @railway/cli open     — open the live URL"
echo "  npx @railway/cli logs     — tail logs"
