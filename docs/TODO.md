# Progress

## wip — Report printing and CSV (`feat/report-print-export`, ready for local review)

- Reuse the shared print document wrapper and existing browser/native print dialog.
  Print Dashboard and Tasks using their existing visual components, selected dates,
  tag/status filters, collapsed sections, calendar year and timeline line choices.
- Print/export every matching task in sorted order across all table pages. Print
  follows Show notes; CSV always includes full notes and ten useful columns
  without internal IDs.
- Expand print-only overflow, repeat table headings, split long tag charts on a
  shared scale and keep SVG pattern IDs unique across screen/print copies.
- Browser CSV download and desktop native save picker share the same formatter;
  cancellation is normal and failures reach the existing error handler.
- Focused CSV/component/native-download tests and browser regressions cover
  filters, all pages, display choices, cancellation, error reporting and SVG scaling.
  Column meanings are in docs/REPORT-EXPORT.md.
- Validation: lint, practices checks, all 316 unit/component tests and production
  build pass. All eight focused report scenarios and ten existing board-print
  cases pass across Chromium/WebKit. Local browser checks debugged actual calendar
  clipping and chart page-break overlaps.
- Reviewed generated PDFs, including a full-year calendar, 35-tag charts and all
  65 rows of a long-note table with repeating headings. Both browser engines also
  show no page overflow at 360px. Native Mac/Windows dialogs still need manual checks.
- Preview: `npm run dev` → http://localhost:1420. Reports → Print on either tab,
  or Tasks → Export CSV. Only local commits; human reviews and publishes.


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

## todo — Reports maintainability (separate follow-up PR)

Schedule after the report printing/CSV PR lands. Preserve current behavior and
appearance; keep this cleanup separate from new features and report calculations.
The goal is to keep routine changes local to the responsibility they affect.

- **Give printable layout a clear owner.** `ReportPrintButton.css` currently
  reaches into dashboard cards, calendars, tag charts and task rows. Move those
  rules under the printable report/document owner so layout fixes are discoverable
  there. Separate the print trigger from request preparation, dialog/error handling
  and cleanup where that makes ownership clearer. Start with `ReportPrintButton`,
  `PrintDocument` and their styles; retain the shared browser/native `printPage`.
- **Keep dashboard display state together.** `ReportsPage` currently passes
  collapse, calendar-year and timeline-line settings through `ReportOverview` to
  individual charts and the printable copy. Give those settings one dashboard
  owner and reuse the same selection for screen and print. Keep shared date/tag
  filters and table status/sort/page state distinct. A new chart display option
  should not require changes in the task table or `App.tsx`.
- **Consolidate trivial single-use components where useful.** Review wrappers
  such as `ReportExportButton` and its one-rule stylesheet. Keep small pieces in
  their owning component when a separate file adds indirection without reuse or
  a meaningful responsibility. Preserve busy/error handling and keyboard access.
  Keep the shared `ReportTable`, `PrintDocument` and chart renderers; continue to
  follow the stylesheet and component-size rules in `PRACTICES.md`.

Acceptance and verification:

- Keep the ten-column CSV contract, full notes, all matching rows, filters and
  sorting unchanged. Preserve screen pagination and display choices after print.
- Preserve dashboard appearance, collapsed sections, calendar year, timeline
  toggles, SVG scaling/patterns, long-chart page breaks, repeating table headings,
  existing board printing and native save cancellation/error behavior.
- Retain the existing tests in `reportCsv.test.ts`, `ReportOutput.test.tsx`,
  `PrintDocument.test.tsx`, download tests, `e2e/reportOutput.spec.ts` and board-print
  smoke cases. Run lint, practices, unit/component tests and build; browser checks
  remain in CI, with local e2e reserved for debugging failures. Compare print/PDF
  output before and after the cleanup.
- Make small commits by responsibility. A CSV-column edit should stay in its
  formatter, focused tests and relevant docs. Avoid adding a general framework,
  changing stored task/history data or bundling the derived-metric cleanup listed
  under Simplification candidates below.

## todo — Remaining reporting follow-up

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
  It can be dropped once confirmed unnecessary for Week printing/AI. Keep
  persisted lineage and dated rondel observations intact.
- Status charts intentionally match saved day lists without filling gaps. Todo
  moves do not retain old day entries; only dated rondel decisions establish that
  they moved. Immutable past status snapshots would need fuller tracking if wanted.
