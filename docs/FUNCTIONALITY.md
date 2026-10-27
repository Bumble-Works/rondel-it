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
- **Cancel** (⋯ menu, detail panel, or the nag) sets a task to `canceled`
  instead of deleting it: its title is **crossed out** and the status circle
  shows a **red ×**. A canceled task sinks to the very bottom of its day.
  Canceling replaced deleting as the way to let a task go, so finished work and
  abandoned work both stay on record.
- A canceled task is **settled**: it keeps the day it was canceled on and its
  controls are turned off — no flag, reminder, reschedule/rondel, drag, or
  copy. Its circle doesn't advance; reopening is a deliberate **Reopen task**
  (the only ⋯ item left, and a button in the detail panel), which brings it
  back as todo at the **top** of its day.
- Reopening a done task (back to todo) moves it to the **top** of its day.
- **Flag (important):** one flag per task, toggled from the row's ⋯ menu
  or the detail panel. A flagged task's title is bold with a small amber flag.
  Flagging **doesn't reorder**; drag it up yourself. The flag carries forward
  when a task is rondeled. History copies can't be flagged or unflagged.
- Done tasks always sink to the bottom of their day. Each day sorts as:
  **active tasks → carried-forward history → done → canceled**. Within each
  group, the order you set by dragging is kept.
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
- Dragging a task into the current period's rondel container anchors it to
  **today** (not back to the period's first day).
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
- `doingRondelCount`: how many counted rondels happened while doing. Older
  tasks can have an unknown split; they aren't assumed to have been todo.
- `startedAt`: first recorded start, kept across carry-forward and reopening.
- `rondelHistory`: dated source/destination observations for counted rondels,
  including todo moves that don't leave a history copy. Scheduling and
  dragging don't add observations. Each observation stays on its source
  record; successor copies inherit totals without duplicating observations.
- `bucketListOrigin`: whether the task began in the Bucket List. The marker
  survives scheduling and carry-forward. Unknown legacy origins stay unknown.
- `canceledAt`: when a task was canceled; cleared if it is reopened.

## Reports

- Reports in the sidebar is available to everyone. Default: This week.
  Presets are This week, Last week, Next week, This month, Last month and Custom.
  Report weeks run Sunday–Saturday, independently of the board's week setting.
  Months include every day of the calendar month, including future dates.
  Custom includes both endpoints. Every report is limited to one calendar year,
  including a full leap year. Longer/reversed/invalid ranges show validation and
  do not calculate or render charts. There is no All time option.
- Preset dates appear under Period. Custom shows only From/Through inputs and
  its range hint, without repeating the same dates as another summary.
- Dashboard and Tasks share date and tag any/all filters. The tag controls stay
  sticky while scrolling. Tabs support Left/Right and Home/End. A task chain
  uses the latest task's tags; same-named independent tasks remain separate.
- Reports use current retained information and recalculate when work is edited,
  retagged, reopened, moved, completed or canceled. They are not saved snapshots.
  One shared load reads retained tasks for the report; every chart receives the
  same calculated dashboard. Date/tag changes reuse tasks in memory rather than
  loading them again per chart. Task changes, window focus and explicit retry
  refresh that shared data. Full retained history preserves task-chain context.
- A task remains relevant from its first scheduled date through resolution,
  inclusive, even after being moved beyond the selected dates. Dated moves,
  decisions made in the period, and retained work/completion evidence can also
  make it relevant. Unscheduled Bucket List ideas and untouched first-time
  week/month plans stay out of the task list until actualized or rondeled.
- Overview boxes appear in order: To do, In progress, Done, Rondeled, Canceled,
  Left behind. They have short captions and no tag chips. To do/In progress use
  current live tasks relevant to the range; Done/Canceled use resolution dates
  in the range. Rondeled counts decisions actually made during the range,
  including repeated moves of one task, once per recorded event. It differs
  from the number of tasks carried across the period boundary and from lifetime
  rondel counts. Older undated rondels are not assigned invented dates; the UI
  shows the recorded number without legacy caveats or a plus sign.
  Overview colors match the status lines and donut charts: purple To do, blue
  In progress, green Done, amber Rondeled and pink Canceled. Left behind uses
  its own coral color, including at zero, to stay distinct from Done.
  Done says "🎉 Look at you go" and Rondeled says "A little reshuffling" preceded
  by the same Rondel icon used on task rows;
  all six overview boxes have hover tooltips explaining their counts.
  Overview captions omit punctuation, start with an emoji or app icon and stay within 25
  characters. Canceled says "🧹 Great job prioritizing"; To do uses ✨ and
  In progress uses 💭.
- Legacy cancellations without canceledAt use their saved task day for reports
  only. Recorded cancellation timestamps take priority. Canceled counts respect
  the same dates and latest-chain tag any/all filters as every other aggregate.
- Left behind counts live to-dos still on past dates, within the report's scope
  and tags. It excludes doing, done/canceled tasks, history copies, Bucket List
  items and waiting containers. Zero says "🌟 All clear nicely done";
  a positive count says "🧭 Needs some attention". Clicking it opens Tasks
  filtered to those items. Show all tasks clears that focus. Open task takes the
  user to that task's day and opens its existing detail panel for action.
  Its hover tooltip says "Unfinished to-dos still dated in the past." The count
  button also exposes that explanation to screen readers.
- A little progress, day by day is immediately below the boxes: a timeline with
  To do, In progress, Done, Rondeled and Canceled lines across the selected dates.
  Status counts match the saved task entries on each calendar day, including
  retained doing history copies. Empty days stay zero; tasks never fill dates
  between their first scheduled day and today or a future period end. Done and
  canceled entries use their list day, even if their resolution timestamp differs.
  Bucket List and unassigned waiting-container items are not day entries.
  Rondeled counts only recorded decisions made on that date in the device's
  timezone; source/destination dates and undated lifetime totals never imply
  extra activity. This reflects the list now, not immutable past status snapshots.
  The chart has at most 366 dates and five series. Distinct dashes, legend
  hover/focus highlighting, line toggles and a shared date tooltip keep equal
  values readable without shifting data. Arrow keys/Home/End explore dates.
- Your little wins retains the completion calendar beneath the timeline. A
  year selector appears when the range crosses New Year; it shows only that
  year's completion dates. Changing display year reuses the existing report.
- Where your list stands and Completion by tag sit side by side with the same
  fixed expanded height. Both aggregate the same saved day entries as the daily
  status lines, rather than the broader task-chain scope used by Tasks and the
  overview boxes. Retained copies count on each day where they actually appear;
  moved-away work is not assigned to its former days without a saved entry.
  Canceled tasks stay out of the completion rate.
  Completion by tag shows task counts: done is solid, doing striped, to-do
  outlined, in the tag's color. Canceled is omitted from this chart. Tag names
  beginning with # label the bar rows; long names are shortened on the axis
  and shown in full on hover/focus. Extra tags scroll within the fixed chart
  space. Counts are available on hover/focus rather than repeated below.
- Zero-activity tags are omitted from each chart. Where tasks keep rolling
  shows lifetime rondel counts for relevant chains, in tag colors. Multi-tag
  tasks contribute fully under each tag. Axes use whole counts and keep their
  edge labels inside the SVG. Redundant chart footnotes are omitted.
- What carried forward retains tasks and decisions out of, into and within
  the range, based on scheduled source/destination dates. For example, a task
  pushed from October to November still appears as outgoing in October.
- Where your rondeled items went shows current outcomes for relevant chains
  with a lifetime rondel count above zero. Every chain belongs to exactly one
  category: Rondeled (still to do), In progress, Done or Canceled. A doing task
  never also counts under Rondeled. The chart shows task counts and percentages.
  On wide windows it sits beside a stack of the shorter duration card and Bucket
  List card, with aligned top and bottom edges. Narrow windows stack the cards.
  Duration bars are shorter and omit the repeated "Since first started" heading.
  Chart collapse controls let users focus on selected sections and shorten the
  page; each section can be reopened independently without recalculating data.
- Bucket List is a compact half-width lower card with Created and Actualized chips for
  genuine Bucket List ideas, captioned "Always room for a little dreaming."
  Each idea counts once when created and once when
  first given a real calendar day; waiting in a week/month container is not
  actualization. Starting or finishing a waiting idea actualizes it onto today;
  canceling it does not. Previously scheduled work parked in Bucket List is
  excluded. This chart always appears at the bottom of the dashboard, including
  zero counts when no dated Bucket List activity is known for the selected period.
  There are no bar tracks or reserved chart space. Positive counts highlight the
  chips and show a short encouragement; zero counts stay quiet.
  Optional bucketHistory observations date these actions separately from rondels,
  including plain drags, and survive copies and reloads. Scheduling out of Bucket
  List does not increase rondelCount. Proven legacy bucket origins can use their
  saved first scheduled day when dated observations are unavailable; inferred
  dates are never written into task storage. A completion celebration still appears
  only for proven Bucket List origins finished in the selected range.
- Tasks shows one row per logical task chain. Columns: Task (with tags), Status,
  First seen, Completed, Rondels, Days in progress. First seen uses the earliest
  retained creation timestamp in the chain, converted to the device's timezone;
  it is not the latest scheduled date or a UTC date slice. Missing legacy
  creation timestamps fall back to the earliest retained scheduled date.
  Unfinished work shows — for Completed. Every column sorts in either direction;
  unknowns stay last and the default is most lifetime rondels first.
- Task status pills support any combination of To do, In progress, Completed
  and Canceled. All statuses includes canceled; selecting every status is the
  same as All. These filters affect the table only, never task state or charts.
  Show notes displays all full notes inline and hides them together. There are
  no per-row expanders, destination or rondel-split columns. At most 50 rows
  render per page; changing dates/tags/status/sort resets to page one. Narrow
  tables scroll inside their panel.
- Days in progress runs from the recorded first start to completion for done
  tasks, or through today for unfinished started tasks, including pauses and
  reopenings. Legacy missing starts can use dated doing history or the current
  real scheduled day for doing/done work. Fallbacks are report-only and never
  written into task storage; recorded starts always win. Untouched to-dos have
  no invented start. No per-row estimate label is shown. Started-to-completed
  averages exclude estimates and invalid intervals. Same-day work is zero days.
  The duration chart omits duplicate bucket summaries and coverage prose.
- There is no Meeting review tab. Existing Week printing serves meeting review;
  report print/export integration remains a follow-up in docs/TODO.md. Removed
  dashboard sections include planned-to-completed duration, the overall lifetime
  rondel histogram and the to-do/doing rondel split. Their existing derived
  calculations remain candidates for later cleanup.

## Drag and drop

- Drag a task by its **grip** (⠿, left of the status circle), with a mouse,
  trackpad or touch. A preview follows the pointer and the task's row stays put,
  dimmed. A blue line shows where it'll land: before or after the task under
  the pointer. Over a section's empty space, the section is highlighted and the
  task goes last there.
- Dragging between days or containers is a **plain move**: no rondel, no count
  change, no history copy. It's for reorganizing.
- Dragging within a day reorders it (the done / history grouping still applies).
- Done tasks, history copies, and the task open in the side panel can't be dragged.
- A drag keeps `originDate`. *(Open question: maybe a plain move of a
  not-started task should update it.)*

## Detail panel and notes

- Clicking a task opens the side panel: title, note, tags, scheduled day,
  rondel count, first scheduled day, created date.
- The panel's status button is named for the status it moves the task to,
  with that status's circle: **Mark as doing**, **Mark as done**, **Mark as
  to-do** (the same as the row's circle tooltip).
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
- If the app opens after today's morning review time and that review hasn't
  fired yet, it catches up once on open. End-of-day does not catch up early.
- The nag opens at review times (plus that missed-morning catch-up), if
  anything needs a decision. It closes when nothing is left. A long list
  scrolls inside it (as in every dialog). It has two sections:
  - **Left undone on past days:** todo/doing tasks on any day before today
    (history copies, done tasks, rondeled and Bucket List items excluded), oldest first.
  - **Rondeled items waiting:** rondeled items whose week/month has started.
- Each item offers **Today, Next week, Next month, Pick a date, Cancel, Done**
  (no "doing"). Moving a past-day task off its day counts as a rondel (a doing
  task leaves its history copy, as usual).
- **Done on a past-day task** marks it done **on the day it was planned**, as
  if you finished it then and forgot to check it off: it stays on that day,
  completed that day. (Done on a rondeled item moves it to today, as before.)
- **Cancel** lets a nagging item go: a past-day task is canceled **on its day**
  (it stays there, resolved, so the past stops nagging), and a rondeled item is
  canceled **onto today** (like starting or finishing one). Either way it's a
  resolution, so the nag stops asking.
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
