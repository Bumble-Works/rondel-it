import { isReportDate, recordedDate } from './reportDates'
import type { ReportLineage } from './reportLineage'
import type { ReportRange } from './reportTypes'
import type { Task, TaskRondel } from './types'

/** Older cancellations kept their day without a timestamp; this fallback is report-only. */
export function reportCancellationDate(task: Task | null): string | null {
  return task?.status === 'canceled' ? recordedDate(task.canceledAt) ?? recordedDate(task.dayDate) : null
}

export function reportScope(lineage: ReportLineage, events: TaskRondel[], range: ReportRange) {
  const current = lineage.current
  const scheduled = lineage.tasks.filter((task) => !task.bucket && !task.rondeled)
  const moves = events.filter((event) => !event.fromBucket && !event.fromRondeled)
  const hasDay = scheduled.some((task) => task.dayDate !== null)
    || moves.some((event) => event.fromDate !== null) || (current?.rondelCount ?? 0) > 0
  const dates = hasDay ? [
    ...lineage.tasks.map((task) => task.originDate),
    ...scheduled.map((task) => task.dayDate),
    ...moves.map((event) => event.fromDate),
  ].filter((date): date is string => date !== null && isReportDate(date)).sort() : []
  const firstScheduledDate = dates[0] ?? null
  const createdDates = lineage.tasks.flatMap((task) => {
    const date = recordedDate(task.createdAt)
    return date ? [date] : []
  }).sort()
  const firstSeenDate = createdDates[0] ?? firstScheduledDate
  const resolved = current?.status === 'done' || current?.status === 'canceled'
  const resolvedDate = current?.status === 'done' ? recordedDate(current.completedAt)
    : reportCancellationDate(current)
  return {
    firstSeenDate,
    firstScheduledDate,
    onListInRange: current !== null && firstScheduledDate !== null && firstScheduledDate <= range.end
      && (!resolved || (resolvedDate !== null && resolvedDate >= range.start)),
  }
}
