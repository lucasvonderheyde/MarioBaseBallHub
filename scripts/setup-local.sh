#!/usr/bin/env bash
# One-time local setup: env file, database, demo league + sample games.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/web"

cd "$WEB"

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
  SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  if grep -q '^SESSION_PASSWORD=change-me' .env.local; then
    sed -i "s|^SESSION_PASSWORD=.*|SESSION_PASSWORD=${SECRET}|" .env.local
  else
    echo "SESSION_PASSWORD=${SECRET}" >> .env.local
  fi
  echo "Created web/.env.local with generated SESSION_PASSWORD"
else
  echo "web/.env.local already exists"
fi

echo "Initializing database…"
npm run db:init

echo "Loading demo league and sample games…"
npm run db:bootstrap

echo ""
echo "Done. Start the app:"
echo "  npm run dev        (from repo root)"
echo ""
echo "Login:"
echo "  username: zomsoth"
echo "  password: baseball123"
