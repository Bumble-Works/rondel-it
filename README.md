# Rondel It

**Don't lose it. Rondel it.**

Rondel It was built to help you plan your day without losing track of unfinished work.
Rondel it to tomorrow, next week or your Bucket List, and keep a record of what you actually worked on.

## Get the app

Download the latest release for your computer:

| Platform | Download | Install |
| --- | --- | --- |
| **Mac** (Apple Silicon and Intel) | [RondelIt-macos.zip](https://github.com/Bumble-Works/rondel-it/releases/latest/download/RondelIt-macos.zip) | Unzip it and move **Rondel It.app** into **Applications**. |
| **Windows** (10 / 11, x64) | [RondelIt-windows-setup.exe](https://github.com/Bumble-Works/rondel-it/releases/latest/download/RondelIt-windows-setup.exe) | Run the installer, then open Rondel It from the Start menu. |

The builds aren't signed yet. On Windows, choose **More info → Run anyway** if
SmartScreen blocks it. On Mac, if macOS blocks the app, open **System Settings → Privacy
& Security → Open Anyway** after trying to launch it.

On Mac, you can also install or update from Terminal:

```bash
curl -fsSL https://github.com/Bumble-Works/rondel-it/releases/latest/download/install.sh | bash
```

This downloads the app, backs up any existing app data, replaces the old version and
opens it. On Windows, download and run the latest installer to update. Both keep your
existing tasks.

Once you're in, add a task and click its circle to move it through **to do → doing →
done**. If you start a task today and rondel it to tomorrow, today's work stays in your
history. The app also counts how many times you've pushed it forward. You can add notes,
`#tags`, reminders and recurring tasks, drag tasks between days, and switch between Day,
Week and Month views.

## Run it locally

Use **Node 26**, the version pinned in `.nvmrc`. With
[nvm](https://github.com/nvm-sh/nvm) installed:

```bash
git clone https://github.com/Bumble-Works/rondel-it.git
cd rondel-it
nvm install
nvm use
npm ci
npm run dev
```

Open **http://localhost:1420**. The browser version saves data locally and works without
a backend, database or API keys. Folder sync and native desktop features need the Mac or
Windows app.

To run the desktop app from source, also install [Rust and the Tauri prerequisites for
your OS](https://v2.tauri.app/start/prerequisites/), then run:

```bash
npm run app:dev
```

`npm run app:build` builds the desktop app. `npm start` also runs the browser version.

## Your data belongs to you

At a time when it feels like nothing belongs to you and everything is for sale,
you can rest assured: your data in Rondel It belongs to you.

Rondel It works offline, with no account to create or server collecting your tasks.
Sync is off by default. Your tasks live in local storage on your device. The browser
version and installed app each have their own separate copy.

If you want the same tasks on another computer, use a cloud drive you already have:

1. Install **Google Drive for desktop, OneDrive, Box or Dropbox** on both computers.
2. In Rondel It, go to **Settings → Sync → Choose folder…** and pick a folder inside that drive. The app creates a **Rondel It** folder there.
3. On the other computer, choose that same **Rondel It** folder in Settings.

Each device keeps its own copy and exchanges changes through that folder. Sync runs on
open, when you return to the app, shortly after an edit, and every two minutes while the
window is visible. If you edit the same task on both computers, the most recent edit
wins once the files reach both devices.

The sync files are ordinary, unencrypted JSON, so your cloud provider and anyone you
give access to that folder can read them. Use a private folder. Task data doesn't pass
through a Rondel It server.

Removing a sync file doesn't delete your tasks: deletions only travel through sync when
you explicitly delete an item in the app. Unreadable files are skipped and reported.

## Under the hood

The browser and desktop apps share a **React + TypeScript** interface built with
**Vite**. **Tauri 2 / Rust** wraps it for Mac and Windows and provides native
notifications, reminder windows and access to the sync folder.

Task rules live in `src/domain/`, separate from the UI. Data access sits behind an
adapter in `src/services/adapters/`; the app uses the local adapter backed by
`localStorage`. Sync writes one JSON snapshot per device and merges changes per task,
tag or recurring rule. Deletion markers distinguish an intentional delete from a missing
file.

To check a change:

```bash
npm run lint
npm run check:practices
npm test
npm run build
```

Tests use **Vitest + React Testing Library**. CI also runs **Playwright** smoke tests in
Chromium and WebKit; Mac and Windows builds are checked when desktop files change.
Releases are published manually through GitHub Actions.

The full behavior is documented in [FUNCTIONALITY.md](docs/FUNCTIONALITY.md). Working
conventions are in [AGENTS.md](AGENTS.md) and [PRACTICES.md](PRACTICES.md).
