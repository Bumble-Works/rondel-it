# Progress

## wip — Reporting (`feat/make-reporting`)

- Restored reporting work from `wip/backup-all` on top of main at `1ddbbd5`
  (cancellation, Quick Add, review timing and container-drag fixes included).
- Restored task tracking, adapter/sync compatibility, pure report calculations,
  range presets, chart components and their existing tests.
- Added the missing dashboard page so the restored branch can compile and run.
- Added dashboard date/tag controls and kept reminders/review dialogs mounted.
- Limited every report to one year (leap years included), removed All time,
  and reused calculations when toggling sections or the calendar display year.
- No commits or pushes: changes remain in the working tree for joint review.

## todo — Reporting follow-up

- Meeting-prep view: dated recorded work/completions with titles, tags and notes.
- Show elapsed days in progress for unfinished work, alongside the completed
  task duration charts, using the retained first-start date.
- Task table: one row per lineage, sorting, durations, carried destinations,
  status controls and optional canceled details.
- Connect printable reports to the system dialog, honoring tags, ranges and
  collapsed sections; retain the chosen view for Save as PDF.
- Connect the recovered CSV helper to the task table and add focused export tests.
- Verify large saved histories remain responsive with a one-year report,
  rapid tag changes and collapsed sections. The current adapter still reads
  all retained tasks to preserve complete lineage and cross-period move counts;
  a one-year view alone doesn't cap the amount of source data processed.
- Check narrow windows, keyboard navigation, chart labels and empty/error states.
- Add report navigation/filter smoke coverage (routine execution stays in CI).
- Review the visual design together at `npm run dev` → http://localhost:1420.

## FOLLOWUP — Compatibility

- Legacy records can have unknown starts, Bucket List origins or todo/doing
  rondel splits, and missing dated moves. Preserve that uncertainty.
- The Rails adapter is on hold and has no complete task-export endpoint;
  Reports shows a clear load error with that adapter.
- Older app versions editing synced records can drop newly added tracking
  fields. Use matching app versions when evaluating reporting across devices.
