#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export NVM_DIR="$HOME/.nvm"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  . "$NVM_DIR/nvm.sh"
  nvm use node >/dev/null
fi

echo "[bootstrap] Installing frontend dependencies..."
npm install

echo "[bootstrap] Installing backend gems..."
cd api
bundle install

echo "[bootstrap] Preparing database..."
bin/rails db:prepare
bin/rails db:seed

echo "[bootstrap] Done."
