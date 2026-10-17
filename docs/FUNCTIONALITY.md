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
- Arrows move by day, week or month. "Today" jumps back. Month steps always go
  from the 1st, so the 31st never skips a month.
- The week starts on the day set in Settings.

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
  so row actions (note, delete, rondel) stay aligned in a fixed grid. When
  rondel doesn't apply, the button is greyed out and its tooltip says why.

- Every rondel adds 1 to `rondelCount`. Copies carry the count forward.
- **Giving a waiting item a day is a decision, not a rondel.** A rondeled
  item in a container, or a Bucket List item, that gets a day (Today, Tomorrow,
  Pick a date) moves there with **no** count increase. Rondeling it to next
  week, next month or the Bucket List still counts.
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
  controls (status, note, delete, rondel, drag) are disabled, with the hint
  "Open in the side panel — edit it there".
- Title and note save when you leave the field. An empty title reverts.
- The row's note button opens a note popup for tasks that aren't open in the panel.

## Tags and filters

- Tags have a name and a color. They're managed in Settings, or created from
  the detail panel.
- Filters by tag (match **any** or **all**) and by status. Selecting every
  status (or every tag in "any" mode) is the same as no filter.
- Deleting a tag removes it from every task.
- Tag names save on blur or Enter. Escape undoes the edit.

## Recurring tasks

- Rules: every week on a weekday, every month on a day (the 31st becomes the
  month's last day), or "start of each week/month" (waits in that period's rondel container).
- A task is created **on its own day, never ahead of time**: the sync only
  goes up to today in your time zone. Browsing forward creates nothing.
- While the app is open, it syncs after midnight. Otherwise it syncs on the next open.
- "Start of week/month" rules keep only one unfinished task at a time. The
  next one isn't created until the current one is done.
- Rule titles save on blur or Enter.

## Nag and review times

- Settings: **morning review time** and **end-of-day rondel time**.
- The nag opens once when the app opens, and again at each review time, if
  any rondeled items are waiting for a decision. It closes when nothing is left.
- *(Planned: the end-of-day review will also cover today's unfinished tasks.)*

## Errors

- Every failed action is logged to the console and shown in a banner with
  what failed. Nothing fails silently.

## Data and storage

- Today the app runs on the local adapter: data lives in the browser's
  storage for the app's origin (`rondel.v6.*` keys).
- Changes must stay **backward compatible** with existing saved data. New
  fields are filled in on read, and nothing is reset.
- Time zone: uses your computer's time zone. It isn't editable in Settings yet.
- The Rails adapter (`VITE_DATA_SOURCE=rails`) sends snake_case and reads camelCase.
