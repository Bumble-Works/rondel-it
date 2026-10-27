import { isReportDate, recordedDate } from './reportDates'
import type { ReportTaskRow } from './reportTypes'
import type { Task, TaskRondel } from './types'

interface ReportStart {
  date: string | null
  source: ReportTaskRow['startDateSource']
}

/** Estimates belong only to reports; they must never become saved start dates. */
export function reportStart(task: Task, chain: Task[], events: TaskRondel[]): ReportStart {
  if (task.startedAt) return { date: recordedDate(task.startedAt), source: 'recorded' }
  const recorded = chain.flatMap((item) => {
    const date = recordedDate(item.startedAt)
    return date ? [date] : []
  }).sort()[0]
  if (recorded) return { date: recorded, source: 'recorded' }
  const history = [
    ...chain.filter((item) => item.id !== task.id && item.status === 'doing' && !item.bucket && !item.rondeled)
      .map((item) => item.dayDate),
    ...events.filter((event) => event.status === 'doing' && !event.fromBucket && !event.fromRondeled)
      .map((event) => event.fromDate),
  ].filter((date): date is string => date !== null && isReportDate(date)).sort()[0]
  if (history) return { date: history, source: 'history' }
  if ((task.status === 'doing' || task.status === 'done') && !task.bucket && !task.rondeled
    && task.dayDate && isReportDate(task.dayDate)) {
    return { date: task.dayDate, source: 'scheduled' }
  }
  return { date: null, source: 'unknown' }
}
