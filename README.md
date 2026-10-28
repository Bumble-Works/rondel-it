# Rondel It

**Don't lose it. Rondel it.**

Plan your day, carry unfinished work forward deliberately, and keep a record of
what you worked on. Works offline on Mac, Windows and in the browser.

[User manual](docs/FUNCTIONALITY.md)

## Install

| Platform | Download | Install |
| --- | --- | --- |
| Mac (Apple Silicon and Intel) | [RondelIt-macos.zip](https://github.com/Bumble-Works/rondel-it/releases/latest/download/RondelIt-macos.zip) | Unzip and move Rondel It.app into Applications. |
| Windows 10/11 (x64) | [RondelIt-windows-setup.exe](https://github.com/Bumble-Works/rondel-it/releases/latest/download/RondelIt-windows-setup.exe) | Run the installer. |

The builds aren't signed. If blocked, use **System Settings → Privacy & Security →
Open Anyway** on Mac, or **More info → Run anyway** on Windows.

To install or update on Mac from Terminal:

```bash
curl -fsSL https://github.com/Bumble-Works/rondel-it/releases/latest/download/install.sh | bash
```

For a private repository, after signing in with `gh auth login`:

```bash
gh release download -R Bumble-Works/rondel-it -p install.sh -O - | bash
```

The Mac script backs up data to
`~/Library/Application Support/RondelIt-backups/`, preserves data from older app
identifiers and moves the old app to the Trash. On Windows, rerun the latest
installer to update. Updates keep your tasks; Windows uninstall removes data
only if you select **Delete the application data**.

## Develop

Use Node 26, pinned in `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm):

```bash
git clone https://github.com/Bumble-Works/rondel-it.git
cd rondel-it
nvm install
nvm use
npm ci
npm run dev
```

Open **http://localhost:1420**. `npm start` runs the same browser app.
No backend, database or API keys are needed.

For desktop development, install [Rust and the Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), then:

```bash
npm run app:dev
npm run app:build
```

Build output is in `src-tauri/target/release/bundle/`. Windows installers use
`npx tauri build --bundles nsis`. Releases are published through GitHub Actions:
**Release → Run workflow → patch, minor or major**.

Run checks with the pinned Node version:

```bash
npm run lint
npm run check:practices
npm test
npm run build
```

Unit and component tests use Vitest and React Testing Library. CI runs Playwright
in Chromium and WebKit; run local browser tests only to debug failures.
Working rules are in [AGENTS.md](AGENTS.md) and [PRACTICES.md](PRACTICES.md).

## Architecture and data

React + TypeScript and Vite provide the shared interface; Tauri 2 / Rust provides
desktop notifications, reminder windows, login startup and folder access.

- `src/domain/`: task rules, recurrence, reporting and sync merging.
- `src/services/adapters/`: local data access and task operations.
- `src/services/storage/`: localStorage persistence under `rondel.v6.*` keys.
- `src/services/queries/`: TanStack Query caches for local reads, refreshed after
  writes and folder sync. Recurring tasks are materialized before views refresh.
- `src/services/sync/`: exchanges `devices/<device-id>.json` snapshots through a chosen folder.
- `src/features/`: app views and their interactions; `src-tauri/`: native integration.

Browser data belongs to its origin; desktop data belongs to app identifier
`com.bumbleworks.rondelit`. They are separate stores. Preserve that identifier
and backward compatibility with saved data. Add defaults when reading new fields;
keep stored records immutable and write changes through the storage layer.

Sync merges the latest edit per task, tag and recurring rule; settings merge as a
whole. Explicit deletion markers distinguish deletes from missing records. Each
device keeps a complete local copy. Invalid records are skipped and reported.
The folder choice and device identity stay on that device. Use matching app
versions across devices so edits preserve the same fields.

Task copies retain links and dated carry-forward history for reports. Missing
historical dates stay unknown; report estimates must not be written back as facts.
Reports recalculate from retained records, so editing a task can change past totals.
Scheduling uses the device's timezone.
