import { todayIso } from './dates'
import { validateReportRange } from './reportDates'
import { lineageEvidence, relevantEvidence } from './reportEvidence'
import { groupLineage, matchesReportTags } from './reportLineage'
import { activityMetrics, durationMetric, percentage, rondelMetrics, tagMetrics } from './reportMetrics'
import { isLeftUndone } from './rondel'
import { reportTimeline } from './reportTimeline'
import { reportBucketActivity } from './reportBucketActivity'
import { listStatusCounts, reportListEntries } from './reportListStatus'
import type { Dashboard, ReportFilters, ReportRange, ReportReviewDay } from './reportTypes'
import type { Tag, Task } from './types'

export type * from './reportTypes'
export { groupLineage, rondelGroupId } from './reportLineage'

export function buildDashboard(
  tasks: Task[], tags: Tag[], range: ReportRange, filters: ReportFilters = {}, today = todayIso(),
): Dashboard {
  validateReportRange(range)
  const seenEvents = new Set<string>()
  const lineages = groupLineage(tasks)
    .filter((lineage) => matchesReportTags(lineage.current ?? lineage.tasks.at(-1)!, filters))
  const evidence = lineages
    .map((lineage) => lineageEvidence(lineage, range, today, seenEvents))
    .filter(relevantEvidence)
  const visible = evidence.filter(({ row }) => filters.includeCanceled || row.status !== 'canceled')
  const activity = activityMetrics(evidence)
  const entries = reportListEntries(lineages, range)
  const { done, todo, doing, canceled } = listStatusCounts(entries)
  const total = done + todo + doing
  const completed = evidence.filter((item) => item.completedInRange)
  const completions = new Map<string, number>()
  for (const { row } of completed) {
    completions.set(row.completedDate!, (completions.get(row.completedDate!) ?? 0) + 1)
  }
  const review = new Map<string, ReportReviewDay>()
  for (const item of visible) {
    for (const entry of item.review) {
      if (!filters.includeCanceled && entry.item.status === 'canceled') continue
      const day = review.get(entry.date) ?? { date: entry.date, items: [] }
      day.items.push(entry.item)
      review.set(entry.date, day)
    }
  }
  return {
    range: { ...range }, completedCount: completed.length,
    activity,
    leftBehindIds: visible.filter((item) => item.current?.status === 'todo' && isLeftUndone(item.current, today)).map(({ row }) => row.id),
    timeline: reportTimeline(entries, evidence, range),
    bucketActivity: reportBucketActivity(lineages, range),
    summary: { total, todo, doing, done, canceled, completionRate: percentage(done, total) },
    completions: [...completions].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value })),
    tagMetrics: tagMetrics(evidence, entries, tags),
    durations: {
      planned: durationMetric(completed.map(({ row }) => row.plannedDays)),
      started: durationMetric(completed.map(({ row }) => row.startDateSource === 'recorded' ? row.startedDays : null)),
    },
    rondels: rondelMetrics(evidence),
    rows: visible.map(({ row }) => row).sort((a, b) => b.rondelCount - a.rondelCount || a.title.localeCompare(b.title)),
    review: [...review.values()].sort((a, b) => a.date.localeCompare(b.date)),
    bucketCompletions: completed.filter(({ row }) => row.bucketListOrigin === true).map(({ row }) => row),
    coverage: {
      partialHistory: evidence.filter(({ row, events }) => row.rondelCount > events.length).length,
      unknownRondelSplit: evidence.filter(({ row }) => row.doingRondelCount === null && row.rondelCount > 0).length,
      missingStarted: completed.filter(({ row }) => row.startDateSource !== 'recorded' || row.startedDays === null).length,
      unknownBucketOrigin: completed.filter(({ row }) => row.bucketListOrigin === null).length,
    },
  }
}
