Rondel It
Don’t lose it. Rondel it.
Rondel It is a premium personal productivity app built around one central idea: unfinished work should not be silently lost at the end of the day. It should be deliberately moved, reviewed, and carried forward.

This project is the working plan for a polished app that starts as a Mac desktop product, stays maintainable by a small team, and is designed with future cross-platform reuse in mind.

Product vision
Rondel It is not just another to-do list.

It is a daily review and planning system for people who want to:

start each day with a clear task list
move tasks through a simple lifecycle: todo → doing → done
know what they actually worked on during the day
carry unfinished work forward deliberately at the end of the day
reflect on patterns across days, weeks, and months
The core differentiator is the end-of-day rondel workflow: unfinished tasks are not just left hanging; they are intentionally routed into a decision point.

Product principles
Simple task states

Todo
Doing
Done
Daily momentum

The app should feel like forward progress, not just a pile of tasks.
Thoughtful carry-forward

Unfinished work should be moved intentionally, not forgotten.
Reflection over productivity theater

The product should help with review, meetings, and self-accountability.
Professional polish

The app should feel premium, bright, and easy to use.
Maintainability

We should minimize security and infrastructure burden so the product is realistic for a small team or solo maintainer.
Core user workflow
Daily task lifecycle
A task starts as an empty circle: todo
It can be toggled once to doing
It can be toggled again to done
Done tasks move to the bottom of the day so active work stays visible
End-of-day rondel workflow
At the configured end-of-day time, unfinished tasks move into a rondel decision view.

Users choose:

move to tomorrow
move to next week
move to a specific date
keep in a backlog or review list
Behavior rules
Untouched tasks move forward as untouched tasks
Started tasks should preserve their history on the original day
The new date should begin with a fresh copy of the task in an unstarted state
The app tracks how many times the task was rondelled
This is the key product idea: work is not lost; it is intentionally redirected and tracked.

Notes and task context
Each task should support a small note field for context like:

tried this and hit a blocker
waiting for support
blocked on a teammate
this depends on another task or ticket
This makes the app useful in meetings, reviews, and self-reflection.

Premium features
The premium layer should support the kinds of features users already pay for in serious productivity apps:

multi-device sync
reporting
categories or custom labels
keyboard shortcut customization
richer filtering
historical rollups by day, week, month, quarter
Reporting goals
Recurring todos (each one would come in as a new todo of its own, recurring would be created elsewhere and not in day mode then click repeat)
Users should be able to answer questions such as:

What did I actually work on today?
What was I doing this week?
Which tasks stayed in doing mode for multiple days?
What work is being carried forward repeatedly?
Which tasks are recurring problem areas?
This reporting layer is designed for meetings, personal review, and self-accountability.

Categories and organization
Categories should support both the daily list and premium reports.

Recommended model:

structured categories rather than only freeform tags
custom categories like work, personal, health, family, admin, deep work
optional color support
filtering in the daily view
reporting by category
This enables a single task system for life and work instead of a single work-only tool.

Design direction
The app should feel polished, bright, and premium.

UX goals
lightweight and satisfying to use
not cluttered or overwhelming
keyboard-first by default
subtle motion for task state changes
strong accessibility and focus states
Design system principles
use design tokens for color, spacing, radius, and motion
keep the palette bright and modern
make task states obvious and snappy
prioritize reading experience and rapid task actions
Keyboard-first requirement
Keyboard support should be first-class, not an add-on.

Planned interactions:

create task
move task to doing
move task to done
navigate tasks
open task detail
add or edit notes
rondel a task forward
filter by category
customize shortcuts in premium
Security and data ownership
A central principle is that we should not become a full-time security and infrastructure operation.

Recommended approach
do not build a private app-owned cloud service as the primary sync system
prefer user-owned cloud storage such as Dropbox, Google Drive, OneDrive, or Box
keep customer data in the customer’s storage account whenever possible
reduce compliance and security burden by offloading hosting concerns
This is not just a technical choice; it is a product and maintenance strategy.

The product should be maintainable by a single person or a very small team without becoming a cloud operations company.

Sync architecture direction
Recommended sync model
local-first experience
sync when online
watch the user’s selected cloud storage location
merge task changes using timestamps and task history metadata
deterministic conflict resolution
near-real-time behavior, not perfect instant guarantee
This approach works well for multi-device use without turning the app into a full hosted SaaS product.

Monetization strategy
Recommended model
one-time app purchase for the base app
annual premium renewal for advanced features
upgrade reminders before the renewal window ends
Why this fits
aligns well with premium desktop software expectations
avoids heavy backend infrastructure for the core app
reduces customer friction and operational burden
keeps the business model sane for a small team
Later-phase possibility
A subscription model could be introduced later for advanced features. But that should be a later decision, not the initial default.

Best technical architecture for reuse
Recommended stack
Desktop app: Tauri + React + TypeScript
Domain logic: shared TypeScript modules in the app for task rules and reporting
Local storage: localStorage today, with SQLite or another local file store as a future option
Sync: per-device JSON snapshots in the user's chosen cloud-drive folder
Shared domain model: tasks, task states, notes, categories, settings, history
Future clients: reuse the core logic across Mac, Windows, Linux, iPhone, Android, and web
Why this is the best fit
This gives us a reusable architecture without overbuilding before validating the product.

It keeps the domain logic portable while letting each platform feel native.

Market position
The market already has many to-do apps and productivity tools, but most are built around:

generic task capture
project management
team workflows
broad checklist patterns
Rondel It stands apart by making intentional carry-forward the product.

This turns the app into a reflection and planning system, not just a task tracker.

MVP scope
Included in v1
 polished Mac desktop app
 daily task list with todo / doing / done states
 done tasks move to bottom of the day
 end-of-day rondel flow
 notes per task
 local-first persistence
 user-owned cloud sync path
 keyboard-first interactions
 basic category support
 premium gating for sync and reporting
Not included in v1
 team collaboration
 full mobile app launch
 heavy AI feature set
 large enterprise compliance layer
 extensive manual time tracking
 deep project hierarchy
Roadmap
Phase 1 — product definition and Mac MVP
 finalize the task lifecycle and rondel rules
 define the end-of-day carry-forward UX
 validate visual direction and motion design
 prototype the Mac interface
 implement daily task creation, updates, notes, and state toggles
Phase 2 — local-first infrastructure and sync
 define task history and daily record model
 implement local persistence
 build user-owned cloud sync layer
 test conflict handling and merge logic
Phase 3 — premium features
 add categories and filtering
 add reporting by day, week, month, quarter
 add keyboard customization for premium users
 gate premium features cleanly
Phase 4 — cross-platform expansion
 evaluate Windows and Linux desktop paths
 plan reusable architecture for mobile apps
 reuse shared domain logic and the device snapshot format
Open decisions to confirm
Should a task that was in doing on a previous day remain visibly marked as doing in that day’s history while the new date starts as todo?
Should categories be structured categories or freeform tags first?
Should reporting rely only on task state history, or include manual time tracking?
Should rondel suggestions be advisory or automatic?
Should done tasks remain visible in the day view or be hidden after a period?
Final recommendation
Rondel It should be built as a premium, polished, keyboard-first daily review tool, with a meaningful task lifecycle and intentional carry-forward as the main differentiator.

The strongest path is:

Mac first
local-first architecture
user-owned cloud sync
app purchase plus annual premium upgrades
shared model for future multi-platform reuse
That approach keeps the product professional, maintainable, and realistic for a small team or solo founder.

Summary
Don’t lose it. Rondel it.

This is the product promise, the day workflow, and the main idea behind the app.

If you want, I can turn this into a tighter one-page product brief next, or into a more specific roadmap with user stories and acceptance criteria.

