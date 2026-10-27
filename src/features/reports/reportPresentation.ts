import type { ReportFlowEvent, ReportTaskRow } from '../../domain/reportTypes'
import type { Tag, TaskStatus } from '../../domain/types'

export const reportStatus: Record<TaskStatus, string> = {
  todo: 'To do', doing: 'In progress', done: 'Completed', canceled: 'Canceled',
}

export function reportDate(date: string | null): string {
  if (!date) return 'Unscheduled'
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function reportDays(days: number | null): string {
  return days === null ? 'Unknown' : `${Number.isInteger(days) ? days : days.toFixed(1)} ${days === 1 ? 'day' : 'days'}`
}

export function reportTags(tagIds: string[], tags: Tag[]): string {
  return tagIds.flatMap((id) => {
    const tag = tags.find((item) => item.id === id)
    return tag ? [`#${tag.name}`] : []
  }).join(' · ')
}

export function flowDestination(flow: ReportFlowEvent): string {
  return flow.toBucket ? 'Bucket List' : `${reportDate(flow.toDate)}${flow.toRondeled ? ' (unassigned)' : ''}`
}

export function progressDays(row: ReportTaskRow): number | null {
  return row.status === 'done' ? row.startedDays : row.inProgressDays
}

export type ReportSort = 'title' | 'status' | 'first-seen' | 'completed' | 'rondels' | 'in-progress'
export type ReportSortDirection = 'ascending' | 'descending'

function sortValue(row: ReportTaskRow, sort: ReportSort): string | number | null {
  switch (sort) {
    case 'title': return row.title
    case 'status': return ['todo', 'doing', 'done', 'canceled'].indexOf(row.status)
    case 'first-seen': return row.firstSeenDate
    case 'completed': return row.completedDate
    case 'in-progress': return progressDays(row)
    case 'rondels': return row.rondelCount
  }
}

export function sortReportRows(
  rows: ReportTaskRow[], sort: ReportSort, direction: ReportSortDirection = sort === 'title' ? 'ascending' : 'descending',
): ReportTaskRow[] {
  return [...rows].sort((a, b) => {
    const left = sortValue(a, sort), right = sortValue(b, sort)
    if (left === null && right !== null) return 1
    if (right === null && left !== null) return -1
    const compared = typeof left === 'number' && typeof right === 'number'
      ? left - right : String(left ?? '').localeCompare(String(right ?? ''))
    return compared * (direction === 'ascending' ? 1 : -1)
      || a.title.localeCompare(b.title) || a.lineageId.localeCompare(b.lineageId)
  })
}
