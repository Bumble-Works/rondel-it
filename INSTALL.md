# Installing Rondel It

Rondel It is a native macOS app (built with Tauri). Your data lives **only on your machine** — no account, no server, no syncing.

---

## Option A — Install from a prebuilt file (easiest)

If you have the built app or installer (from `src-tauri/target/release/bundle/`):

1. **From the `.dmg`:** double-click `Rondel It_<version>_aarch64.dmg`, then drag **Rondel It** into your **Applications** folder.
2. **Or from the `.app`:** drag **Rondel It.app** into **Applications**.
3. Open it from **Launchpad** or **Applications**.

**First launch (unsigned build):** macOS may say the app is from an unidentified developer. Right‑click (or Control‑click) the app → **Open** → **Open**. You only need to do this once. If it’s still blocked, run:

```bash
xattr -dr com.apple.quarantine "/Applications/Rondel It.app"
```

> Apple Silicon (M‑series) build. For an Intel Mac, build from source (below) on that machine.

---

## Option B — Build it yourself from source

Use this on any Mac to produce your own app.

### 1. One‑time prerequisites

```bash
# Xcode command line tools (compiler)
xcode-select --install

# Homebrew — https://brew.sh (skip if already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js (v20+) and Rust (v1.85+)
brew install node rust
```

Verify:

```bash
node -v      # v20 or newer
cargo -v     # 1.85 or newer
```

### 2. Get the code and install dependencies

```bash
git clone https://github.com/Bumble-Works/rondel-it.git
cd rondel-it
npm install
```

### 3. Run it

- **Bootstrap local web+api dev prerequisites (deps + db):**
  ```bash
  npm run bootstrap
  ```
- **Try it live (dev window with hot reload):**
  ```bash
  npm run app:dev
  ```
- **Start web + Rails API together (non-Tauri flow):**
  ```bash
  npm run start
  ```
- **Build the installable app:**
  ```bash
  npm run app:build
  ```
  The finished app and installer are here:
  - App: `src-tauri/target/release/bundle/macos/Rondel It.app`
  - Installer: `src-tauri/target/release/bundle/dmg/Rondel It_<version>_aarch64.dmg`

  Drag the `.app` into **Applications** to install.

---

## Updating after you tweak the app

```bash
npm run app:build
cp -R "src-tauri/target/release/bundle/macos/Rondel It.app" /Applications/
```

---

## Where your data is stored

- Everything is stored **locally** inside the app (no cloud, no sync).
- It persists across restarts and reboots.
- It stays on this Mac only — installing on another Mac starts fresh.

**Coming later:** optional sync via your own Google Drive / iCloud Drive folder, so two Macs can share the same data without any server.
