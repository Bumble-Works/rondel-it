import type { ReportTaskRow } from '../../domain/reportTypes'
import { progressDays, reportDate, reportDays, reportStatus } from './reportPresentation'

export type ReportSortDirection = 'ascending' | 'descending'
interface ReportColumn {
  key: string
  label: string
  value: (row: ReportTaskRow) => string | number | null
  text: (row: ReportTaskRow) => string | number
  defaultDirection: ReportSortDirection
}

export const reportTableColumns = [
  { key: 'title', label: 'Task', value: (row) => row.title, text: (row) => row.title, defaultDirection: 'ascending' },
  { key: 'status', label: 'Status', value: (row) => ['todo', 'doing', 'done', 'canceled'].indexOf(row.status),
    text: (row) => reportStatus[row.status], defaultDirection: 'descending' },
  { key: 'first-seen', label: 'First seen', value: (row) => row.firstSeenDate,
    text: (row) => row.firstSeenDate ? reportDate(row.firstSeenDate) : '—', defaultDirection: 'descending' },
  { key: 'completed', label: 'Completed', value: (row) => row.completedDate,
    text: (row) => row.completedDate ? reportDate(row.completedDate) : '—', defaultDirection: 'descending' },
  { key: 'rondels', label: 'Rondels', value: (row) => row.rondelCount, text: (row) => row.rondelCount, defaultDirection: 'descending' },
  { key: 'in-progress', label: 'Days in progress', value: progressDays, text: (row) => {
    const days = progressDays(row)
    return days !== null ? reportDays(days) : row.status === 'doing' || row.status === 'done' ? 'Unknown' : '—'
  }, defaultDirection: 'descending' },
] as const satisfies readonly ReportColumn[]

export type ReportSort = typeof reportTableColumns[number]['key']
const columnFor = (sort: ReportSort) => reportTableColumns.find((column) => column.key === sort)!
export const defaultReportSortDirection = (sort: ReportSort): ReportSortDirection => columnFor(sort).defaultDirection

export function sortReportRows(
  rows: ReportTaskRow[], sort: ReportSort, direction: ReportSortDirection = defaultReportSortDirection(sort),
): ReportTaskRow[] {
  const column = columnFor(sort)
  return [...rows].sort((a, b) => {
    const left = column.value(a), right = column.value(b)
    if (left === null && right !== null) return 1
    if (right === null && left !== null) return -1
    const compared = typeof left === 'number' && typeof right === 'number'
      ? left - right : String(left ?? '').localeCompare(String(right ?? ''))
    return compared * (direction === 'ascending' ? 1 : -1)
      || a.title.localeCompare(b.title) || a.lineageId.localeCompare(b.lineageId)
  })
}
