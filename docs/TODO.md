# Progress

## wip — Quick tags and time (`feat/quick-tags-and-time`, ready for local review)

- Add visible tag and reminder-time controls on task rows and both add flows.
- Search, create and toggle several tags without closing the picker or opening
  task details. Keep rapid changes serialized against current saved tags.
- Offer explicit time suggestions for `@10:00` or `10:00`; preserve unpicked text.
- Keep reminders restricted to dated tasks and retain recurring reminder scope.
- Recurring tags remain per occurrence. A quiet explanation appears inside its
  picker once per device, then stays gone; series edits stay on the recurring page.
- Keep notes on their own line above the tags/time controls for clear alignment.
- Implementation complete; lint, practices checks, all 324 unit/component tests
  and production build pass. Local commit only; human reviews and publishes.
- Preview: `npm run dev` → http://localhost:1420. Use Tags/Time beneath any
  task or in either add flow; notes sit above those controls.

## in-pr — Reporting dashboard (`feat/make-reporting`)

- Restored reporting work from `wip/backup-all` on top of main at `1ddbbd5`
  (cancellation, Quick Add, review timing and container-drag fixes included).
- Restored task tracking, adapter/sync compatibility, pure report calculations,
  range presets, chart components and their existing tests.
- Added the missing dashboard page so the restored branch can compile and run.
- Added dashboard date/tag controls and kept reminders/review dialogs mounted.
- Limited every report to one year (leap years included), removed All time,
  and reused calculations when toggling sections or the calendar display year.
- Added deterministic browser coverage for dashboard totals, lineage and move
  counts, tag any/all filters, date presets, inclusive Custom dates, the one-year
  limit, collapse/keyboard behavior, persisted todo rondels, legacy/empty data,
  and date-field placement at 360px. Both Chromium and WebKit use the existing
  CI e2e job; browser execution remains in CI per `PRACTICES.md`.

## in-pr — Task reports and activity charts (`feat/report-review-details`, PR #40)

- Built on `feat/make-reporting` at `f3b2d47`, now merged into main via PR #39.
  PR #40 contains the task reports and activity charts; follow-up review fixes
  are committed locally for the human to review and push.
- Dashboard/Tasks tabs share sticky tag any/all filters and dates. Tasks has
  multi-select status pills including canceled, column sorting, 50-row pages
  and one toggle for full inline notes. Removed per-row expanders and jargon.
- Simplified dates to This week (default), Last week, Next week, This month,
  Last month and Custom. Weeks are full Sunday–Saturday periods; months include
  their complete calendar dates. Custom retains the one-calendar-year limit.
- First seen now uses chain creation timestamps in the device's timezone.
  Recorded starts take priority over report-only legacy fallback durations.
- Unfinished task chains remain in Tasks and the overview after being pushed
  forward. Daily status lines, the donut and tag status bars use saved day entries
  only, including retained doing copies. Empty days remain zero, without carryover.
- Ordered overview: To do, In progress, Done, Rondeled, Canceled, Left behind.
  Legacy cancellation dates/counts and latest-chain tag attribution are covered.
  Left behind opens an actionable task list; zero gets a small compliment.
  Done/Rondeled use playful captions; all six overview boxes explain their counts
  in hover tooltips. Captions omit punctuation, start with an emoji (🧹 for Canceled)
  or the existing app icon for Rondeled
  and stay within 25 characters.
- Overview chips and status charts share one palette: purple To do, blue
  In progress, green Done, amber Rondeled, pink Canceled. Left behind stays
  coral and explains the past-dated unfinished to-dos in a hover tooltip.
- Added the status timeline directly under the boxes, with distinct line styles,
  shared tooltips, legend highlighting/toggles and keyboard date navigation.
  It matches each day's current list. Rondels use recorded decision dates only;
  no inferred movement dates or status entries are added.
- Status and Completion by tag charts have equal fixed heights. Tag names label
  rows and long lists scroll internally; done/doing/to-do use solid/striped/outline
  bars. Removed canceled here, the duplicate tag timeline and redundant footnotes.
- Added exclusive current outcomes for rondeled chains (no doing double-count)
  and compact Bucket List Created/Actualized chips with encouragement for positive
  activity and the caption "Always room for a little dreaming." It counts genuine ideas
  once at creation and first real-day scheduling, excludes parked scheduled work,
  and always stays visible with zero counts, including missing legacy provenance.
- Organized the bottom row as a shorter duration card above Bucket List, beside
  rondel outcomes, with aligned outer edges and a single column in narrow windows.
- Added minimal optional bucketHistory observations with backward-compatible
  defaults and sync validation. Waiting containers and cancellation do not
  actualize an idea; scheduling it onto a real day never adds a rondel.
- Review fixes preserve legacy first actualization through later Bucket List
  transfers, reset pagination when filters are cleared, and expose duration
  counts to screen readers and hover/keyboard tooltips. Bucket transfer source
  dates are optional observed data; inferred legacy dates remain report-only.
- Removed the unused timeline-note CSS. Local PR description text, including
  preview instructions, is in `tmp/pr40-review-fixes.md` for manual use.
- Review-fix validation: lint, practices checks, all 294 unit/component tests
  and production build pass in a clean copy containing only the fixes.
- Added domain, adapter, chart and interaction tests plus Chromium/WebKit coverage
  for loading, dates/timezone, notes, filters, cancellation, left-behind navigation,
  timeline overlaps, sizing, clipping, sticky filters, and bucket persistence.
- Validation: lint, practices, all 286 unit/component tests and production build pass.
  All 44 reporting browser scenarios are verified in Chromium and WebKit,
  including focused reruns after correcting the carryover expectations and
  stationary-pointer interference with keyboard date selection.
  The Bucket List visibility/persistence scenario also passes in both browsers
  after removing the guard that hid the card when provenance was unavailable.
  Bottom-row alignment is verified in both browsers, with screenshots reviewed.
  Results are recorded in the local draft at
  tmp/report-review-details-pr.md. Local e2e was used to debug the reported loading
  and chart issues; routine browser verification remains a CI responsibility.

## todo — Remaining reporting follow-up

- Connect printable reports to the system dialog, honoring tags, ranges and
  collapsed sections; retain the chosen view for Save as PDF.
- Connect the recovered CSV helper to the task table and add focused export tests.
- Verify large saved histories remain responsive with a one-year report,
  rapid tag changes and collapsed sections. The current adapter still reads
  all retained tasks to preserve complete lineage and cross-period move counts;
  a one-year view alone doesn't cap the amount of source data processed.
- Check narrow windows, keyboard navigation, chart labels and empty/error states.
- Review the visual design together at `npm run dev` → http://localhost:1420.

## FOLLOWUP — Compatibility

- Legacy records can have unknown starts, Bucket List origins or todo/doing
  rondel splits, and missing dated moves. Preserve that uncertainty.
- Older app versions editing synced records can drop newly added tracking
  fields. Use matching app versions when evaluating reporting across devices.

## FOLLOWUP — Simplification candidates

- The only new persisted field on this stacked branch is optional bucketHistory,
  needed for dated Bucket List transfers that do not count as rondels. No new
  snapshots, dependency packages or full status-event log.
- Planned-duration aggregates, lifetime-rondel buckets and split counters remain
  in the existing report model although their dashboard sections are gone.
  Review unused derived results in an isolated cleanup, preserving useful AI data.
- Day-grouped review data is still generated although Meeting review was removed.
  It can be dropped once confirmed unnecessary for Week printing/AI. CSV wiring
  is also pending. Keep persisted lineage and dated rondel observations intact.
- Status charts intentionally match saved day lists without filling gaps. Todo
  moves do not retain old day entries; only dated rondel decisions establish that
  they moved. Immutable past status snapshots would need fuller tracking if wanted.
