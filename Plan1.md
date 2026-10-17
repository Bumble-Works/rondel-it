---

# Stage 1 — Detailed Engineering Plan (Agent Spec)

Stage 1 is a single-user MVP: no auth UI, no billing, no sync — just the core
daily loop with a real Rails backend and a local-first-friendly React client.

## Decisions (2026-10-17)
- **Tags, not categories.** We call them tags because they're used with `#`.
  "Category" below means tag. The Rails API (PR #3) still needs renaming.
- **Rondel rules (UX):**
  - *todo:* the task moves to the target and no longer appears on the old day.
  - *doing:* the old day keeps a read-only history copy (still `doing`,
    `carried_to_id` set). The target gets a new `doing` copy. Changing the new
    copy never affects the old one.
    History copies are greyed out, have a tooltip explaining why, and sort
    below active tasks but above done.
  - *done* (and history copies): rondel isn't offered.
  - *deleting a carried copy* makes the history it came from a normal task
    again. Deleting a copy in the middle of a chain re-links its neighbors.
  - *drag between days* is a plain move (reorganizing), never a rondel. Only
    an intentional "push this off" from the Rondel menu counts.
    For now a drag keeps `origin_date` (Mon → Wed still says "first
    scheduled Mon"). *Open:* we may want a plain move of a not-started task to
    update `origin_date` instead, since reorganizing isn't pushing work off.
- **Rondel data (reporting):** every task keeps `origin_date` (the first day it
  was scheduled) and `rondel_count`. Copies link back through
  `origin_task_id` / `previous_task_id`.
- **In Stage 1 scope** (already in the frontend): Bucket List, recurring tasks,
  the parked "Unassigned" container per week/month, the `canceled` status, and
  the overdue nag.
- **Still needed:** see "Next PRs" below.
- **Recurring tasks are created on their own day**, never ahead of time. The
  sync horizon is today in the user's time zone, so browsing forward creates
  nothing. While the app is open it re-syncs after midnight; otherwise it
  syncs on the next open. (Later, Rails can do this with a nightly job.)
- Live data must stay backward compatible (mock adapter, `rondel.v6.*` keys).

## Architecture at a glance
- Backend: Rails 7+ API-only app (`api/` folder), PostgreSQL, JSON endpoints.
- Frontend: React + TypeScript + Vite (repo root), talks to Rails via a typed adapter.
- Source of truth: Rails/PostgreSQL. Status transitions and rondel logic live in
  Rails services; the client mirrors, it does not own domain rules.

## Rails models (Stage 1)

### Task
- `id` (uuid pk), `title` (string, required)
- `status` (enum: `todo`/`doing`/`done`, default `todo`)
- `day_date` (date, required, indexed)
- `position` (integer) — sort order within the day
- `rondel_count` (integer, default 0)
- `origin_task_id` (uuid, nullable self-ref) — first task in the lineage
- `previous_task_id` (uuid, nullable self-ref) — task it was moved from
- `completed_at` (datetime, nullable), `created_at`, `updated_at`
- Associations: `has_many :task_events`, `has_one :task_note`,
  `has_and_belongs_to_many :categories`, self-refs for origin/previous.

### TaskNote
- `id` (uuid pk), `task_id` (fk, unique), `body` (text), timestamps.

### TaskEvent (immutable history — powers reporting)
- `id` (uuid pk), `task_id` (fk, indexed)
- `event_type` (enum: `created`/`status_changed`/`note_updated`/`rondelled`/`category_changed`)
- `from_value` (string, nullable), `to_value` (string, nullable)
- `occurred_on` (date), `created_at`. Append-only.

### RondelEvent (carry-forward moves)
- `id` (uuid pk), `task_id` (fk, source), `resulting_task_id` (fk, nullable, target)
- `from_date` (date), `to_date` (date), `from_status` (string), `reason` (nullable), `created_at`.

### Category
- `id` (uuid pk), `name` (string, required, unique in v1), `color` (hex, nullable), timestamps.
- `has_and_belongs_to_many :tasks`.

### UserSetting (single row in Stage 1)
- `id` (uuid pk), `end_of_day_time` (time, default 17:00), `timezone` (string), timestamps.

## Rails services (logic lives here, not controllers)
- `Tasks::AdvanceStatus` — applies `todo → doing → done`, sets `completed_at`,
  appends `TaskEvent(status_changed)`.
- `Tasks::Rondel` — creates next-day task reset to `todo`, increments
  `rondel_count`, links `origin_task_id`/`previous_task_id`, writes `RondelEvent`
  + `TaskEvent(rondelled)`, leaves source day history intact.
- `Tasks::Reorder` — recomputes `position` so done tasks sort to the bottom.
- `Notes::Upsert` — upserts note, appends `TaskEvent(note_updated)`.

## JSON API (`/api/v1`)
- `GET  /days/:date/tasks` — day list (todo/doing first, done last)
- `POST /tasks` — `{ title, day_date, category_ids? }`
- `PATCH /tasks/:id` — update title/categories
- `POST /tasks/:id/advance` — move status forward one step
- `POST /tasks/:id/rondel` — `{ to_date, reason? }`
- `PUT  /tasks/:id/note` — `{ body }`
- `GET  /tasks/:id/events` — history
- `GET/POST /categories`, `GET/PATCH /settings`
- camelCase JSON via serializers; ISO date strings.

## React data layer contract
- `src/services/api/` — typed client, one function per endpoint.
- `src/services/adapters/` — `DataSource` seam (per PRACTICES.md): mock adapter
  + Rails adapter interchangeable via factory + `VITE_DATA_SOURCE` toggle.
- `src/features/day/` — day view: list, task row, status toggle, empty state.
- `src/features/task/` — detail panel + note editor.
- `src/features/rondel/` — end-of-day modal + carry-forward actions.
- `src/shared/` — reusable UI (Button, StatusIcon ring, Modal) + design tokens.
- Optimistic updates on toggle/note-save; reconcile with API result.

## Stage 1 build order
Backend:
- [ ] generate API-only Rails app in `api/` (PostgreSQL, uuid pk)
- [ ] models: Task, TaskNote, TaskEvent, RondelEvent, Category, UserSetting
- [ ] migrations + indexes (`day_date`, `task_id`, join table)
- [ ] services: AdvanceStatus, Rondel, Reorder, Notes::Upsert
- [ ] controllers + routes + serializers (camelCase)
- [ ] request specs per endpoint + dev seed data

Frontend:
- [ ] design tokens (CSS vars) for color/spacing/radius/motion
- [ ] `DataSource` seam + mock adapter + Rails adapter + factory
- [ ] day view: list, StatusIcon ring, create task, toggle status
- [ ] done-to-bottom ordering wired to API positions
- [ ] task detail panel + note editor
- [ ] end-of-day rondel modal (tomorrow / next week / specific date / backlog)
- [ ] basic category filter bar
- [ ] keyboard-first interactions for all core actions
- [ ] unit tests for adapters/logic; component tests for UI

## Stage 1 acceptance criteria
- Create/advance/complete a task persists via the Rails API.
- Done tasks always sort below active tasks.
- Rondel: increments `rondel_count`, creates fresh `todo` on target date,
  preserves source history, writes a `RondelEvent`.
- Notes persist and are retrievable.
- Full keyboard path: create → doing → done → rondel.
- Runs against Rails API and (via seam) a mock adapter.

## Next PRs (after #2, #3, #4 merge)

### End-of-day rondel flow
- At `endOfDayTime`, open a review of **today's** unfinished tasks (todo + doing).
  Right now the nag only covers parked items from past weeks.
- Each task gets the Rondel options (tomorrow / pick a date / next week /
  next month / Bucket List), plus "mark done" and "leave it".
- Follows the rondel rules above (todo moves; doing leaves history).

### Keyboard shortcuts
- Create a task, move between tasks, open details, advance status,
  rondel, add/edit a note, filter by tag.
- Full keyboard path: create → doing → done → rondel (Stage 1 acceptance).
- Customizing shortcuts stays out of scope (premium).

### Smaller fixes found in the PR #2 review
- Recurring "start" rules: finishing a task late creates the next one in a
  past week (`lastRunDate` only moves when a task is created).
- Recurring rules use the UTC date from `createdAt`, so a rule made in the
  evening (US) can skip today.
- Recurring sync silently deletes "duplicate" pending tasks, notes included.
  Remove it, or log it.
- Double-clicking the status circle sends 3 updates at once, which can race
  against Rails.
- Deleting a task needs a confirm or undo.
- Split `App.tsx` (~700 lines) into per-feature hooks.
- Repo housekeeping: replace the Vite boilerplate in README, add `src-tauri`
  or drop `@tauri-apps/cli`, add the `check:practices` script PRACTICES.md
  mentions, create `docs/TODO.md`.
- Rails API (PR #3): rename categories → tags, and align endpoints with the
  frontend adapter.

## Out of scope for Stage 1
- Auth UI, multi-user, billing
- Cloud sync / user-owned storage
- Reporting dashboards (only the event data model is laid down)
- Keyboard shortcut customization
- Windows/Linux/mobile packaging