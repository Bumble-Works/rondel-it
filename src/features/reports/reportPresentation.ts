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

