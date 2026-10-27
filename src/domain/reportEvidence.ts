import { calendarDays, inReportRange, recordedDate } from './reportDates'
import type { ReportLineage } from './reportLineage'
import { reportStart } from './reportStart'
import { reportCancellationDate, reportScope } from './reportScope'
import type { ReportFlowEvent, ReportRange, ReportReviewItem, ReportTaskRow } from './reportTypes'
import type { Task, TaskRondel } from './types'

export interface LineageEvidence {
  row: ReportTaskRow
  current: Task | null
  events: TaskRondel[]
  review: { date: string; item: ReportReviewItem }[]
  completedInRange: boolean
  canceledInRange: boolean
  onListInRange: boolean
  decisionsInRange: number
}

function flowDirection(event: TaskRondel, range: ReportRange): ReportFlowEvent['direction'] | null {
  const source = !event.fromBucket && inReportRange(event.fromDate, range)
  const destination = !event.toBucket && inReportRange(event.toDate, range)
  if (source && destination) return 'within'
  if (source) return 'outgoing'
  if (destination) return 'incoming'
  return null
}

function collectEvents(tasks: Task[], seen: Set<string>): TaskRondel[] {
  const events: TaskRondel[] = []
  for (const task of tasks) {
    for (const event of task.rondelHistory ?? []) {
      if (seen.has(event.id)) continue
      seen.add(event.id)
      events.push(event)
    }
  }
  return events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id))
}

function reviewEvidence(lineage: ReportLineage, range: ReportRange): LineageEvidence['review'] {
  const result: LineageEvidence['review'] = []
  const seen = new Set<string>()
  for (const task of lineage.tasks) {
    if (task.status === 'todo' || task.bucket || task.rondeled) continue
    const date = task.status === 'done' ? recordedDate(task.completedAt)
      : task.status === 'canceled' ? reportCancellationDate(task) : task.dayDate
    if (!inReportRange(date, range)) continue
    const key = `${date}:${task.status}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ date: date!, item: {
      id: task.id, lineageId: lineage.id, title: task.title, note: task.note,
      tagIds: task.tagIds, status: task.status, carriedForward: task.carriedToId !== null,
    } })
  }
  return result
}

export function lineageEvidence(
  lineage: ReportLineage, range: ReportRange, today: string, seenEvents: Set<string>,
): LineageEvidence {
  const task = lineage.current ?? lineage.tasks.at(-1)!
  const completedDate = task.status === 'done' ? recordedDate(task.completedAt) : null
  const canceledDate = reportCancellationDate(task)
  const events = collectEvents(lineage.tasks, seenEvents)
  const flows = events.flatMap((event): ReportFlowEvent[] => {
    const direction = flowDirection(event, range)
    return direction ? [{ ...event, direction }] : []
  })
  const review = reviewEvidence(lineage, range)
  const doingRondelCount = task.doingRondelCount ?? null
  const start = reportStart(task, lineage.tasks, events)
  const scope = reportScope(lineage, events, range)
  return {
    current: lineage.current, events, review,
    onListInRange: scope.onListInRange,
    decisionsInRange: events.filter((event) => inReportRange(recordedDate(event.occurredAt), range)).length,
    completedInRange: lineage.current !== null && inReportRange(completedDate, range),
    canceledInRange: lineage.current !== null && inReportRange(canceledDate, range),
    row: {
      id: task.id, lineageId: lineage.id, title: task.title, note: task.note,
      tagIds: [...task.tagIds], status: task.status, dayDate: task.dayDate,
      rondeled: task.rondeled, bucket: task.bucket,
      scheduledInRange: lineage.current !== null && !task.bucket && !task.rondeled && inReportRange(task.dayDate, range),
      firstSeenDate: scope.firstSeenDate,
      completedDate, canceledDate, rondelCount: task.rondelCount, doingRondelCount,
      todoRondelCount: doingRondelCount === null ? null : task.rondelCount - doingRondelCount,
      plannedDays: calendarDays(task.originDate, completedDate),
      startDateSource: start.source,
      startedDays: calendarDays(start.date, completedDate),
      inProgressDays: task.status === 'todo' || task.status === 'doing'
        ? calendarDays(start.date, today) : null,
      bucketListOrigin: task.bucketListOrigin ?? null, flows,
      hasRecordedWork: review.some(({ item }) => item.status !== 'canceled'),
    },
  }
}

export function relevantEvidence(item: LineageEvidence): boolean {
  const unknownResolution = (item.row.status === 'done' && item.row.completedDate === null)
    || (item.row.status === 'canceled' && item.row.canceledDate === null)
  return item.onListInRange || item.decisionsInRange > 0 || (unknownResolution && item.row.scheduledInRange) || item.completedInRange || item.canceledInRange
    || item.review.length > 0 || item.row.flows.length > 0
}
