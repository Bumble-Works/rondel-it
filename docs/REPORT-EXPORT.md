# Report CSV columns

Tasks → Export CSV exports all matching tasks in the current sort order, across
every page. Date, tag, status and Left behind filters apply. Full notes are always
included, even when hidden on screen. Each logical task chain has one row;
same-titled independent tasks remain separate. No internal IDs are exported.

| Column | Meaning |
| --- | --- |
| Task | Current retained task title. |
| Status | To do, In progress, Completed or Canceled. |
| Tags | Current tag names, separated by semicolons. |
| First seen | Earliest retained creation date in the chain, with a scheduled-date fallback for legacy records missing timestamps. |
| Scheduled date | Current saved date. For work waiting in a week/month container, this is its waiting-period date. Blank for unscheduled work. |
| Completed date | Completion date for completed work; otherwise blank. |
| Canceled date | Cancellation date for canceled work; legacy records without a timestamp use their saved task day. Otherwise blank. |
| Days in progress | For completed work, start to completion; for unfinished started work, start through today. Includes pauses and reopenings. Same-day work is zero. Unknown/invalid intervals and canceled work are blank. |
| Rondels | Lifetime count of deliberate carry-forward decisions. Scheduling and ordinary dragging do not increase it. |
| Note | Full current task note, including line breaks. |

The UTF-8 filename includes the inclusive report dates. Dates use `YYYY-MM-DD`
in this device's time zone; counts and durations are numeric. Missing dates and
durations stay blank, while known zero values remain zero. Legacy durations can
use retained work or scheduled-day evidence as a fallback, matching the table.
Export changes no task data.

Text that could execute as a spreadsheet formula receives a leading apostrophe;
commas, quotes and multiline notes use standard CSV escaping.
