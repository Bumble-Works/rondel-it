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

export type ReportSort = 'title' | 'rondels' | 'planned' | 'started' | 'date'

export function sortReportRows(rows: ReportTaskRow[], sort: ReportSort): ReportTaskRow[] {
  return [...rows].sort((a, b) => {
    if (sort === 'rondels') return b.rondelCount - a.rondelCount || a.title.localeCompare(b.title)
    if (sort === 'planned') return (b.plannedDays ?? -1) - (a.plannedDays ?? -1) || a.title.localeCompare(b.title)
    if (sort === 'started') return (b.startedDays ?? b.inProgressDays ?? -1) - (a.startedDays ?? a.inProgressDays ?? -1)
    if (sort === 'date') return (b.completedDate ?? b.dayDate ?? '').localeCompare(a.completedDate ?? a.dayDate ?? '')
    return a.title.localeCompare(b.title)
  })
}
