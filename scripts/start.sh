#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export NVM_DIR="$HOME/.nvm"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  . "$NVM_DIR/nvm.sh"
  nvm use node >/dev/null
fi

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${WEB_PID:-}" ]]; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

echo "[start] Starting Rails API on http://localhost:3000"
(cd api && bin/rails server -p 3000) &
API_PID=$!

echo "[start] Starting Vite on http://localhost:5173 (rails adapter)"
VITE_DATA_SOURCE=rails VITE_API_BASE_URL=http://localhost:3000/api/v1 npm run dev &
WEB_PID=$!

wait "$API_PID" "$WEB_PID"
