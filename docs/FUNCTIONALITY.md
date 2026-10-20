# Rondel It — Functionality

This is the source of truth for how the app is **meant** to behave.
If the app does something different from this doc, it's a bug. If we want it
to behave differently, update this doc in the same change as the code.

Plans (`Plan1.md`, …) are temporary and get deleted once done. This doc stays.

## Philosophy

- A to-do list should be **conquerable**, not a pile that's always carried over.
- Unfinished and rondeled work **nags on purpose**, until you make a deliberate
  decision: give it a day, rondel it on, finish it, or delete it.
- Rondeling is a decision ("I'm pushing this off"), so it's tracked.
  Reorganizing (dragging) isn't.

## Tasks and statuses

- Statuses: **todo → doing → done**. Clicking the status circle advances one
  step. Clicking a done task's circle reopens it as todo. Double-clicking sets
  it to done.
- `canceled` exists in the data model, but nothing in the UI sets it yet.
- Reopening a done task (back to todo) moves it to the **top** of its day.
- **Flag (important):** one flag per task, toggled from the row's ⋯ menu
  or the detail panel. A flagged task's title is bold with a small amber flag.
  Flagging **doesn't reorder**; drag it up yourself. The flag carries forward
  when a task is rondeled. History copies can't be flagged or unflagged.
- Done tasks always sink to the bottom of their day. Each day sorts as:
  **active tasks → carried-forward history → done**. Within each group, the
  order you set by dragging is kept.
- A **rondeled item** (waiting for next week/month) that you start (doing) or
  finish (done) **becomes a regular task on today** with that status. It keeps
  its rondel count, first scheduled day and created date. See "Rondeled items".
- Bucket List tasks (no day) can't change status. The circle says "Give it a
  date to start".
- Quick-add creates a todo in that section. If tag filters are active, the
  new task gets those tags.

## Views

- **Day**: that day's tasks, plus the current week's rondel container ("Unassigned").
- **Week**: each day of the week (newest first), plus the week's rondel container.
- **Month**: each day of the month (newest first), plus the month's rondel container.
- **Bucket List**: items you want to keep and never forget. They have no
  date and don't nag. From there an item can be given a date or rondeled.
  Nothing goes there automatically; it's always a deliberate choice.
- Day section headers name the weekday too: **"Today (Wednesday)"**,
  "Tomorrow (Thursday)", "Yesterday (Tuesday)"; other days show just the
  weekday. The Day view's page title stays short ("Today") because its
  subtitle already says "Wednesday, October 15".
- **Week and Month** views scroll to today when they open on the period that
  contains today (they list the newest day first).
- In **Day** and **Bucket List** views the section doesn't repeat the page
  title: it shows a slim row with the task count ("3 tasks").
  Week and Month keep each day's title, since there are many days.
- Arrows move by day, week or month. "Today" jumps back. Month steps always go
  from the 1st, so the 31st never skips a month.
- The week starts on the day set in Settings.
- **Narrow windows** (down to 360px, at least as narrow as Apple Reminders):
  below 760px the sidebar becomes a drawer opened from the ☰ button, with all
  its sections (views, filters, Recurring, Settings). Picking anything closes
  it, as does clicking outside. The detail panel slides over the list.

## Rondeled items (the "Unassigned" container)

- Rondel → **Next week** puts a task in next week's container (dated the
  first day of the week). **Next month** puts it in next month's (dated the 1st).
- A rondeled item **nags from the day its week or month starts** (not before),
  at every review time, until you decide.
- The container for the period that includes today also shows anything still
  rondeled to earlier periods, so nothing is lost. Nothing moves on its own:
  an item rondeled to Nov 1 that's never acted on is still nagging on Dec 1.
- **Starting or finishing a rondeled item** (status circle, or "Mark done" in the
  nag) turns it into a regular task **on today**, with that status. Its rondel
  count, first scheduled day and created date are kept.

## Rondel

The rondel menu (on a row and in the detail panel) offers: Tomorrow, Pick a
date (today or later), Next week, Next month, Bucket List. The nag offers:
Today, Next week, Next month, Pick a date, Mark done.

| Task is… | What rondel does |
| --- | --- |
| **todo** | Moves to the target. It's gone from the old day. |
| **doing** (on a real day) | The old day keeps a **read-only, greyed-out history copy** (still "doing"). The target gets a new **doing** copy. |
| **doing** (in a rondel container / Bucket List) | Moves to the target and stays "doing". |
| **done** | Not offered (button greyed out: "Done — nothing left to rondel"). |
| **history copy** | Not offered (button greyed out, with the history tooltip). |

- The rondel button is **always shown** on every row and in the detail panel,
  so row actions (note, rondel, ⋯) stay aligned in a fixed grid. When
  rondel doesn't apply, the button is greyed out and its tooltip says why.

- Every rondel adds 1 to `rondelCount`. Copies carry the count forward.
- **Scheduling isn't rondeling** (no count increase):
  - Taking a **Bucket List** item out to anywhere (a day, next week, next
    month) is scheduling it for the first time; its first scheduled day is set then.
  - Giving a **rondeled item** (waiting in a container) a day (Today, Tomorrow,
    Pick a date). Rondeling it on again (next week/month, Bucket List) still counts.
- On a **Bucket List** item the rondel button reads as scheduling: tooltip
  "Schedule it — give it a day", menu "Schedule it for…", and no "Bucket List"
  option (it's already there).
- Changing the new copy (e.g. back to todo) never affects the history copy.
- History copies: greyed out, can't be dragged or changed, and the tooltip
  says "Just a memory now. The real one rolled forward."
- **Deleting** the live copy makes the history it came from a normal task
  again. Deleting a copy in the middle of a chain re-links its neighbors.

### Reporting data kept on every task

- `originDate`: the first day the task (or its chain) was scheduled.
- `rondelCount`: how many times it's been rondeled.
- `originTaskId` / `previousTaskId`: link copies back to the original and to
  the previous hop. `carriedToId` marks a history copy.

## Drag and drop

- Dragging between days or containers is a **plain move**: no rondel, no count
  change, no history copy. It's for reorganizing.
- Dragging within a day reorders it (the done / history grouping still applies).
- Done tasks, history copies, and the task open in the side panel can't be dragged.
- A drag keeps `originDate`. *(Open question: maybe a plain move of a
  not-started task should update it.)*

## Detail panel and notes

- Clicking a task opens the side panel: title, note, tags, scheduled day,
  rondel count, first scheduled day, created date.
- **One editor per task:** while a task is open in the panel, its row's
  controls (status, note, rondel, ⋯, drag) are disabled, with the hint
  "Open in the side panel — edit it there".
- Title and note save when you leave the field. An empty title reverts.
- The row's note button opens a note popup for tasks that aren't open in the panel.
- **Row actions:** note and rondel sit in the row (drawn the same size); the
  rest is under **⋯**:
  - **Copy to tomorrow** / **Copy to a date…** — a fresh to-do on that day with
    the same title, tags, note and flag. It starts new: to-do, not recurring
    (even if copied from a recurring task), never rondeled, no history or
    reminder. The original is untouched.
  - **Flag as important** (not on history copies) and **Add reminder** (tasks
    with a day; opens the side panel with the reminder time focused; shows the
    time once set).
  - **Delete task**.
  Disabled buttons (task open in the panel) don't react to hover.

## Links

- Web links (`https://…`, `http://…`, `www.…`) in a task's **title** and
  **note** are clickable and open in the default browser (also from the Mac app).
  Clicking a link only opens it; it doesn't open the side panel.
- Links are shown short: no `https://` or `www.`, and long ones trimmed to
  ~32 characters with "…". The tooltip and the link itself use the full URL.
- In the side panel, the title and note are text boxes, so their links are
  listed (clickable) under the note.
- **Long text never runs over the buttons on the right**, at any width: long
  titles, words and links wrap; the note preview and long tag names are
  trimmed with "…". The same holds in the nag list, recurring rules and
  sidebar tag filters.

## Tags and filters

- Tags have a name and a color. They're managed in Settings, or created from
  the detail panel or by typing `#name`. **New tags cycle through the colors**
  (the least-used one next), so they don't all come out blue. Settings
  suggests the next color too; you can always pick another.
- Filters by tag (match **any** or **all**) and by status. Selecting every
  status is the same as no filter. Selecting every tag is not: it hides
  untagged tasks (so with a single tag, you can filter by it).
- Deleting a tag removes it from every task.
- Tag names save on blur or Enter. Escape undoes the edit.
- **`#tag` while adding a task:** typing `#` in "Add a task" suggests tags
  (case-insensitive, so `#Family` = `family`). Enter/Tab or a click picks one:
  the `#word` is stripped from the title and the tag is attached. A **new**
  tag is only created when you deliberately pick "Create #name" (click, or
  arrow to it then Enter). An unpicked `#word` stays as plain title text.
  Active tag filters are added to the new task too.
- **`#tag` in the side panel title** works the same way: picking a suggestion
  attaches the tag right away and strips the `#word`; the title saves on blur
  or Enter. Suggestions are colored chips in a wrapping row (just `#` lists
  every tag; each letter narrows it down), with "Create #…" on its own line.
  A tag that's already on the task (or rule) still shows, marked
  "✓ Added", so it's clear why there's nothing to add; picking it just clears
  the typed `#word`. In the side panel, the title (without the `#word`) is
  saved as soon as you pick, so the board row matches right away.
- The suggestions open just below the text box (or above, if there's no
  room), on top of everything, so they're never cut off.

## Recurring tasks

- **Repeats**: Daily (the default), Monthly, Yearly, Custom…, or one of the
  two rondel rules (start of every week/month). Monthly and Yearly use the
  **Starts** date's day.
- **Custom…**: every N days, weeks, months or years.
  - Weeks: pick the weekdays (at least one stays selected). "Every 2 weeks"
    counts from the start date's week.
  - Months: either **on these dates** (tap any of 1–31, e.g. the 1st and
    15th; at least one stays selected; the 31st becomes the month's last day)
    or **on the [first…fourth/last] [weekday]**.
  - Years: on the start date (Feb 29 falls on Feb 28 in other years).
- **End repeat**: Never, or On date (that day is included).
- A plain-words summary ("Every 2 weeks on Mon, Thu") shows under the form
  and in the rules list.
- "Start of every week/month" is still there (the task waits in that
  period's rondel container). Rules made before Custom existed (every week
  on a weekday, every month on a day) keep working unchanged.
- A task is created **on its own day, never ahead of time**: the sync only
  goes up to today in your time zone. Browsing forward creates nothing.
  - Except a **new rule's first task**, which is always created right away,
    even if its day is still ahead (e.g. rent on the 1st, made on the 19th),
    so it's clear the rule worked. The next one then waits for its own day.
- Recurring tasks are created once per day (and again when rules change), not
  on every action. While the app is open it catches the new day after
  midnight; otherwise on the next open.
- **One at a time, for every rule:** the next task isn't created until the
  previous one is finished. To-do and doing both count as open (they're what
  the nag lists); done or canceled lets the next one in.
  - Days that come due while one is open are **skipped**, not created late.
    Example: gym every Monday, last Monday's finished on Thursday → the next
    one appears next Monday.
  - "Start of week/month" tasks wait in the current week's/month's container,
    so finishing last period's one brings in this period's (never a past one).
  - If the app wasn't opened for a few days, only the latest due one is created.
  - The Recurring page sums this up in one line under its title.
- **The rule form** works like the task side panel: the title takes `#tags`
  (same suggestions as adding a task), a "+ Tag" menu toggles or creates
  tags, a flag button in the corner flags each task it creates, and a
  **Note** (copied onto each task) lists its links underneath.
- **Editing:** each rule in the list has Edit (pencil) and Delete. Edit fills
  the form with the rule (title "Edit recurring task", Save changes /
  Cancel) and highlights it in the list. Saving also updates the rule's open
  task (to-do or doing): its title, tags, note, flag and reminder follow the
  edit, but it stays on its day. Done tasks stay as they were. Rules made before custom repeat
  open as the same pattern (e.g. "every Monday" as weekly on Monday).
- After adding or saving, the form starts over (empty, Daily, no tags, flag,
  note or reminder).
- Flagged rules show a flag before their title in the list.
- **Spotting recurring tasks:** a task a rule created shows a purple repeat
  icon before its title; hovering it shows the pattern ("Recurring: Every
  day"). The side panel has a **Repeats** field with the same pattern, or
  "Rule deleted" if the rule is gone (the task itself stays).

## Reminders

- A dated task can have a **reminder time** (side panel → Reminder). Only a
  time: the task's day is the date. The row shows 🔔 and the time.
- A reminder needs a day: Bucket List items, rondeled items waiting in a
  container and history copies can't have one ("Give it a day to set a reminder").
- At that time a **notification** appears: Notification Center in the Mac
  app, the notification area in the Windows app (the browser version uses
  browser notifications). Permission is asked the first time you set a reminder.
- It also **pops up**, showing just that task. In the Mac and Windows apps it's
  a small window that comes up **on top of whatever app you're in** (even when
  Rondel It is hidden), without the board; the browser version shows it as a
  dialog. Several reminders due together share one pop-up. Each offers:
  - **Snooze 10 min:** the task's reminder time moves to 10 minutes from now
    (never past 23:59), and it pops up again then.
  - **Done.**
  - **Reschedule:** Tomorrow, Next week, Next month, Pick a date, as in the
    rondel menu (it counts as a rondel; the reminder time goes with the task).
  - Closing the pop-up lets all its reminders go (they already fired).
- Reminders fire **while the app is running, even if its window is hidden or
  minimized**, but not while it's fully quit. A reminder missed earlier today
  (app closed, computer asleep) fires when the app opens; earlier days don't.
  Each fires once, even across restarts. Done tasks don't remind.
- **Recurring rules** can have a reminder time; each task they create gets it.
  Changing the reminder on a recurring task asks **"Only this one"** or
  **"All"** (the rule, plus its tasks that aren't done yet).

## Nag and review times

- Settings: **morning review time** and **end-of-day rondel time**.
- At each review time, if anything needs a decision, the nag opens and a
  notification appears, **even while the window is hidden** (same rules as
  reminders: the app must be running). In the Mac and Windows apps the window
  comes **to the front, on top of whatever app you're in**, with the nag open.
  Review times already past when the app opens are covered by the nag shown on
  open.
- The nag opens once when the app opens, and again at each review time, if
  anything needs a decision. It closes when nothing is left. A long list
  scrolls inside it (as in every dialog). It has two sections:
  - **Left undone on past days:** todo/doing tasks on any day before today
    (history copies, done tasks, rondeled and Bucket List items excluded), oldest first.
  - **Rondeled items waiting:** rondeled items whose week/month has started.
- Each item offers **Today, Next week, Next month, Pick a date, Done** (no
  "doing"). Moving a past-day task off its day counts as a rondel (a doing task
  leaves its history copy, as usual).
- **Done on a past-day task** marks it done **on the day it was planned**, as
  if you finished it then and forgot to check it off: it stays on that day,
  completed that day. (Done on a rondeled item moves it to today, as before.)
- *(Planned: the end-of-day review will also cover today's unfinished tasks.)*

## Red dot on the app icon (Mac and Windows apps)

- While a **reminder pop-up or the nag is prompting**, the app icon shows a red
  dot: the Dock icon's badge on the Mac, the taskbar button on Windows. No
  count, just the dot.
- It clears once nothing is prompting: every item handled, or the prompt
  closed ("Later", the close button).
- Windows has no taskbar button while the app is hidden (started at login), so
  no dot then; the reminder pop-up and the review still come to the front.

## Start at login (Mac and Windows apps)

- Settings → Week & day rhythm → **Start Rondel It at login**. **Off by
  default.** It's this computer's login item, so it's per device and never
  synced (the browser version doesn't show it).
- Started at login, the app opens **hidden** in the background, so reminders
  and review times still arrive. Clicking it in the Dock (Mac), or opening it
  again from the Start menu (Windows), shows the window; it never starts a
  second copy.
- While it's on, an icon shows the app is running, with **Open Rondel It** and
  **Quit Rondel It**: in the Mac **menu bar** (one-color logo, tinted for
  light/dark menu bars), or the Windows **system tray** (the color logo).
  Turning the setting off removes the icon.

## Sync (Mac and Windows apps)

- **Off by default.** Settings → Sync → *Choose folder…* picks a folder in a
  cloud drive's desktop folder (Google Drive, OneDrive, Box, Dropbox). Rondel
  It creates `Rondel It/` there with a `README.txt` and a `devices/` folder.
  Picking a folder that's already named "Rondel It" uses it as-is.
- Settings shows where it is (e.g. "Google Drive › My Drive › Rondel It"),
  when it last synced, and *Sync now*, *Show in Finder* (*Show in File
  Explorer* on Windows), *Change folder…*, *Turn off*. In the browser version
  it says sync needs the Mac or Windows app.
- **When:** on open, when the window regains focus, ~2 seconds after any
  change, and every 2 minutes while the window is visible (paused while hidden).
- **How:** each device writes its full data to `devices/<device-id>.json` and
  reads the others. Per task / tag / recurring rule, **the most recent edit
  wins**; settings too. Data saved before sync existed counts as oldest.
- **Access:** the app can only read and write inside the folder you picked
  (macOS grants it when you choose the folder; it's remembered across restarts).
- **Cloud drive not running:** if the picked folder is gone (drive signed out
  or not running), sync stops with a message once, and Settings shows it. It
  never creates a local stand-in folder.
- **Clocks:** each edit is stamped later than anything this device has seen,
  so a slightly-behind clock can't lose your edit. A device file stamped more
  than a day in the future is ignored entirely (wrong clock or tampering).
- **Recurring tasks** get the same id on every device (rule + day), so two
  Macs opening on the same day produce one task, not two.
- **Copied Macs** (e.g. Migration Assistant) are detected and get their own
  device id, so both keep syncing.
- It only rewrites its own file when something changed. An edit made while a
  sync is running goes out in a follow-up pass right after.
- **Never loses data:**
  - Each device keeps its own full copy; the folder is just a mailbox.
  - Something is only deleted by an explicit deletion marker (made when you
    delete it), never because it's missing from a file.
  - A deletion only wins over edits made before it.
  - If the folder disappears, it's rebuilt from this device's data, with a warning.
  - Files that can't be read (half-downloaded, hand-edited) are ignored and
    reported, never applied. Malformed items inside a file are skipped and
    reported; the rest of that file is used. Settings from another device are
    used only if every field is valid (week start 0–6, times as HH:mm, a real
    time zone).
- The sync folder choice and device id are per device and never synced.

## Printing

- **🖨 in the top bar, on every view.** Its tooltip says what it prints
  ("Print Week of Oct 12 – Oct 18, every day with tasks"). It prints the view
  as shown:
  - **Day:** that day ("Monday, October 19").
  - **Week / Month:** the whole period ("Week of Oct 12 – Oct 18",
    "October 2026"), one heading per day in calendar order.
  - **Bucket List:** the list, titled "Bucket List".
- **One day from Week or Month:** each day's header has its own 🖨 (it shows
  when you hover the day; tooltip "Print Monday, October 19"), for preparing
  tomorrow or next Monday without switching views. Day view uses the top bar.
- **Rondeled items** waiting in the week's/month's container are not printed.
- Empty sections are left out; if nothing is left, the page says "Nothing to
  print."
- It prints **what's shown right now**: active tag/status filters apply, and
  the page says which filters were on. The system print dialog also offers
  *Save as PDF*.
- Each task shows a round status mark and label (○ To do, ◐ Doing, ● Done;
  history copies print as "◐ Worked on, carried forward"), ⚑ if flagged, its
  tags, and its full note. Only the sheet prints, not the app around it.

## Errors

- Every failed action is logged to the console and shown in a banner with
  what failed. Nothing fails silently.

## Data and storage

- Today the app runs on the local adapter: data lives in the web view's
  storage (`rondel.v6.*` keys). In the browser that's per origin
  (`localhost:1420`); in the Mac and Windows apps it's per app identifier
  (`com.bumbleworks.rondelit`). They don't share data (sync aside).
- **Installing/updating the Mac app** (`scripts/install.sh`, see INSTALL.md)
  always backs up existing data first, carries data over from an older
  identifier, and moves the old app to the Trash. It never deletes data.
- **Installing/updating the Windows app** (`RondelIt-windows-setup.exe`)
  installs for the current user (no admin needed) and keeps existing data;
  only uninstalling with "Delete the application data" ticked removes it.
- Changes must stay **backward compatible** with existing saved data. New
  fields are filled in on read, and nothing is reset.
- Done items left in a rondel container by older versions are moved, on read,
  to the day they were completed.
- Time zone: everything (the board's "today", review times, reminders,
  midnight and recurring tasks) uses **this device's** time zone, so it
  follows you when you travel. The synced settings' `timezone` isn't used.
- The Rails adapter (`VITE_DATA_SOURCE=rails`) sends snake_case and reads camelCase.
