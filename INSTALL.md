# Installing Rondel It

Rondel It is a native Mac and Windows app (built with Tauri). Your data lives **only on your machine**: no account, no server. (Optional sync through your own Google Drive / OneDrive / Box / Dropbox folder: Settings → Sync.)

---

## Mac, option A — One command (install or update)

Paste this into Terminal. It installs the latest build, or updates the one you have:

```bash
curl -fsSL https://github.com/Bumble-Works/rondel-it/releases/latest/download/install.sh | bash
```

If the repo is private, use the GitHub CLI instead (after `gh auth login` once):

```bash
gh release download -R Bumble-Works/rondel-it -p install.sh -O - | bash
```

What it does:

1. Downloads the latest build (works on Apple Silicon and Intel).
2. **Backs up your existing app data first**, to
   `~/Library/Application Support/RondelIt-backups/<date-time>/`.
3. If your old install used a different app identifier, copies its data over
   so the new version opens with your tasks.
4. Moves the old app to the Trash (not deleted) and installs the new one in
   **Applications**, clearing the "unidentified developer" block.
5. Opens it.

New versions are released by hand, not on every merge: on GitHub, **Actions →
Release → Run workflow**, then pick **patch**, **minor** or **major** (which part
of `x.y.z` goes up). It tags `main` as `vX.Y.Z`, builds the app with that
version and publishes it as the latest release, with every PR merged since the
previous release in its notes. Running the installer again updates to it.

---

## Windows

1. Download **[RondelIt-windows-setup.exe](https://github.com/Bumble-Works/rondel-it/releases/latest/download/RondelIt-windows-setup.exe)**
   (always the latest release; Windows 10 or 11).
2. Run it. The app isn't signed yet, so Windows shows **"Windows protected
   your PC"**: click **More info → Run anyway**.
3. It installs for your user only (no admin password) and adds Rondel It to the
   Start menu.

**To update**, download and run the newest setup the same way. Your data is
kept: it lives in `%LOCALAPPDATA%\com.bumbleworks.rondelit`, and is only removed
if you uninstall with **"Delete the application data"** ticked.

To build it yourself on Windows: install [Node 22+](https://nodejs.org), [Rust](https://rustup.rs)
and the [Tauri prerequisites](https://tauri.app/start/prerequisites/#windows), then
`npm install` and `npx tauri build --bundles nsis`. The installer lands in
`src-tauri/target/release/bundle/nsis/`.

---

## Mac, option B — Build it yourself from source

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
