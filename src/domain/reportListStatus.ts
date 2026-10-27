import { inReportRange } from './reportDates'
import type { ReportLineage } from './reportLineage'
import type { ReportRange, ReportTaskStatuses } from './reportTypes'
import type { TaskStatus } from './types'

export interface ReportListEntry {
  date: string
  status: TaskStatus
  tagIds: string[]
}

/** Count the saved day entries, including retained doing copies, without filling gaps. */
export function reportListEntries(lineages: ReportLineage[], range: ReportRange): ReportListEntry[] {
  return lineages.flatMap((lineage) => {
    const tagIds = (lineage.current ?? lineage.tasks.at(-1)!).tagIds
    return lineage.tasks.flatMap((task) => !task.bucket && !task.rondeled && inReportRange(task.dayDate, range)
      ? [{ date: task.dayDate!, status: task.status, tagIds }] : [])
  })
}

export function listStatusCounts(entries: ReportListEntry[]): ReportTaskStatuses {
  return entries.reduce((counts, entry) => {
    counts[entry.status]++
    return counts
  }, { todo: 0, doing: 0, done: 0, canceled: 0 })
}
