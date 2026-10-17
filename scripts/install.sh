#!/usr/bin/env bash
# Install or update the Rondel It Mac app from the latest GitHub release,
# keeping (and first backing up) existing app data.
#
#   curl -fsSL https://github.com/Bumble-Works/rondel-it/releases/latest/download/install.sh | bash
#   gh release download -R Bumble-Works/rondel-it -p install.sh -O - | bash   # works if the repo is private
set -euo pipefail
shopt -s nullglob

REPO="Bumble-Works/rondel-it"
APP_NAME="Rondel It"
NEW_ID="com.bumbleworks.rondelit"
ASSET="RondelIt-macos.zip"
DEST_DIR="${RONDEL_DEST:-/Applications}"   # overridable for testing

say() { printf '\033[1m[rondel]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[rondel] %s\033[0m\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "This installer is for macOS."

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1. Download the latest build. gh works for private repos too; curl needs it public.
say "Downloading the latest $APP_NAME..."
if [[ -n "${RONDEL_ZIP:-}" ]]; then
  cp "$RONDEL_ZIP" "$TMP/$ASSET"   # testing: use a local build
elif command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh release download -R "$REPO" -p "$ASSET" -D "$TMP" || fail "Download failed (gh)."
else
  curl -fsSL "https://github.com/$REPO/releases/latest/download/$ASSET" -o "$TMP/$ASSET" \
    || fail "Download failed. If the repo is private, install the GitHub CLI and run 'gh auth login' first."
fi
ditto -x -k "$TMP/$ASSET" "$TMP/unzipped" || fail "Couldn't unzip the download."
NEW_APP="$TMP/unzipped/$APP_NAME.app"
[[ -d "$NEW_APP" ]] || fail "The download didn't contain $APP_NAME.app."

# 2. Find any existing install and the identifier its data is stored under.
OLD_APPS=()
for app in "$DEST_DIR"/*ondel*.app "$HOME/Applications"/*ondel*.app; do OLD_APPS+=("$app"); done
OLD_IDS=()
for app in ${OLD_APPS[@]+"${OLD_APPS[@]}"}; do
  id="$(defaults read "$app/Contents/Info" CFBundleIdentifier 2>/dev/null || true)"
  [[ -n "$id" ]] && OLD_IDS+=("$id")
  say "Found existing install: $app (${id:-unknown id})"
done

# 3. Quit the app so its data is fully written before we copy it.
osascript -e "tell application \"$APP_NAME\" to quit" >/dev/null 2>&1 || true
sleep 1

# 4. Back up every data folder the old or new identifier uses.
data_dirs() {
  local id="$1"
  echo "$HOME/Library/WebKit/$id"
  echo "$HOME/Library/Application Support/$id"
  echo "$HOME/Library/HTTPStorages/$id"
}
BACKUP="$HOME/Library/Application Support/RondelIt-backups/$(date +%Y%m%d-%H%M%S)"
backed_up=0
seen=" "
for id in ${OLD_IDS[@]+"${OLD_IDS[@]}"} "$NEW_ID"; do
  [[ "$seen" == *" $id "* ]] && continue
  seen="$seen$id "
  while IFS= read -r dir; do
    if [[ -d "$dir" ]]; then
      # Keep the parent name (WebKit / Application Support / HTTPStorages):
      # each holds a folder named after the identifier.
      parent="$BACKUP/$(basename "$(dirname "$dir")")"
      mkdir -p "$parent"
      cp -R "$dir" "$parent/" && backed_up=1
    fi
  done < <(data_dirs "$id")
done
if [[ "$backed_up" == 1 ]]; then say "Backed up existing data to: $BACKUP"; else say "No existing data found (fresh install)."; fi

# 5. If the old build used a different identifier, carry its data over once.
for id in ${OLD_IDS[@]+"${OLD_IDS[@]}"}; do
  [[ "$id" == "$NEW_ID" ]] && continue
  while IFS= read -r dir; do
    target="${dir/$id/$NEW_ID}"
    if [[ -d "$dir" && ! -e "$target" ]]; then
      mkdir -p "$(dirname "$target")"
      cp -R "$dir" "$target"
      say "Carried data over from $id → $NEW_ID ($(basename "$(dirname "$dir")"))"
    fi
  done < <(data_dirs "$id")
done

# 6. Replace the app (old copies are moved to the Trash, not deleted).
for app in ${OLD_APPS[@]+"${OLD_APPS[@]}"}; do
  mv "$app" "$HOME/.Trash/$(basename "$app" .app) $(date +%H%M%S).app" || fail "Couldn't move $app to the Trash."
done
mv "$NEW_APP" "$DEST_DIR/" || fail "Couldn't copy into $DEST_DIR (try: sudo bash)."
xattr -dr com.apple.quarantine "$DEST_DIR/$APP_NAME.app" 2>/dev/null || true

VERSION="$(defaults read "$DEST_DIR/$APP_NAME.app/Contents/Info" CFBundleShortVersionString 2>/dev/null || echo '?')"
say "Installed $APP_NAME $VERSION."
[[ -n "${RONDEL_NO_OPEN:-}" ]] || open "$DEST_DIR/$APP_NAME.app"
