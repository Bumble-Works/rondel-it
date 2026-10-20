# Rondel It

**Don't lose it. Rondel it.**

A daily task app built around one idea: unfinished work shouldn't silently
disappear at the end of the day. You **rondel** it: deliberately push it to
tomorrow, a date, next week, next month or your Bucket List, and Rondel It
remembers how many times you did.

- Tasks move **todo → doing → done**.
- Rondeling something you'd started leaves a history copy on the original day,
  so your week shows what you actually worked on.
- Rondeled items nag you until you decide, because a to-do list should be conquerable.
- Tags (`#tag` while typing), flags, notes, recurring tasks, Day / Week / Month views.

How everything is meant to behave: [`docs/FUNCTIONALITY.md`](docs/FUNCTIONALITY.md).

---

## Install the Mac app

Paste this into Terminal. The same command **installs or updates**:

```bash
curl -fsSL https://github.com/Bumble-Works/rondel-it/releases/latest/download/install.sh | bash
```

It downloads the latest build (Apple Silicon and Intel), **backs up your
existing data first**, moves any old version to the Trash, and opens the app.
Your data stays on your Mac. More detail, and the version for a private repo:
[`INSTALL.md`](INSTALL.md).

## Install the Windows app

Download **[RondelIt-windows-setup.exe](https://github.com/Bumble-Works/rondel-it/releases/latest/download/RondelIt-windows-setup.exe)**
and run it. To update, run the newest one; your data is kept. The app isn't
signed yet, so Windows says "Windows protected your PC": click **More info →
Run anyway**. Details in [`INSTALL.md`](INSTALL.md).

## Sync between devices (optional)

Rondel It syncs through a folder in a cloud drive you already use, so there's
no account and no Rondel server.

1. Install your cloud drive's desktop app: **Google Drive for desktop**,
   OneDrive, Box or Dropbox. It appears in Finder (Mac) or File Explorer
   (Windows).
2. In Rondel It, open **Settings → Sync → Choose folder…** and pick a folder
   inside that drive (for example *Google Drive › My Drive*). Rondel It
   creates a **Rondel It** folder there.
3. On your other computer (Mac or Windows), install Rondel It, then choose
   **the same Rondel It folder** (or the folder that contains it).

It syncs when the app opens, when you switch back to it, a moment after each
change, and every couple of minutes. If the same task is edited on two
devices, the most recent edit wins.

**Safe by design:** every device keeps its own full copy. Deleting or messing
with the sync folder never deletes your tasks; Rondel It rebuilds the folder
and ignores files it can't read. Please don't edit the files inside it.

Sync works in the Mac and Windows apps (not in the browser version).

---

## Develop

Requires Node 22+ (`nvm use`).

```bash
npm install
npm run dev        # browser version at http://localhost:1420
npm run lint
npm test
npm run build
```

The Mac and Windows apps wrap the same code with [Tauri](https://tauri.app) (`src-tauri/`).
`npm run app:dev` runs it locally (needs Rust). CI checks it builds on PRs;
releases are run by hand (see [INSTALL.md](INSTALL.md)).

The Mac app icon's source is `src-tauri/app-icon.svg`. To regenerate the
icon set after editing it: render it to a 1024×1024 PNG, then run
`npx tauri icon <that.png> -o src-tauri/icons` (keep only the files already there).

Working rules for people and AI agents: [`AGENTS.md`](AGENTS.md) and
[`PRACTICES.md`](PRACTICES.md).
