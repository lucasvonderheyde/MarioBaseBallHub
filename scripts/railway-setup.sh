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

echo "Setting environment variables…"
npx @railway/cli variables set \
  "DATABASE_URL=file:/app/data/league.db" \
  "SESSION_PASSWORD=${SECRET}"

echo ""
echo "IMPORTANT — configure once in the Railway dashboard (Settings):"
echo "  1. Root Directory: web"
echo "  2. Config file path (if shown): /web/railway.toml"
echo "  3. Volume mounted at: /app/data"
echo "  4. Redeploy after the volume is attached"
echo ""
echo "Deploying…"
npx @railway/cli up --detach

echo ""
echo "Deployment triggered. After deploy completes:"
echo "  npx @railway/cli open     — open the live URL"
echo "  npx @railway/cli logs     — tail logs"
