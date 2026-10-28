import type { ReportRange, ReportTaskRow } from '../../domain/reportTypes'
import type { Tag } from '../../domain/types'
import { progressDays, reportStatus } from './reportPresentation'

export interface ReportCsvContext { range: ReportRange }

function csvCell(value: string | number | null): string {
  if (typeof value === 'number') return String(value)
  const text = value ?? ''
  // Quoting alone does not stop spreadsheet applications executing formulas.
  const safe = /^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function reportCsv(rows: ReportTaskRow[], tags: Tag[]): string {
  const names = new Map(tags.map((tag) => [tag.id, tag.name]))
  const headings = ['Task', 'Status', 'Tags', 'First seen', 'Scheduled date', 'Completed date', 'Canceled date',
    'Days in progress', 'Rondels', 'Note']
  const body = rows.map((row) => [
    row.title, reportStatus[row.status], row.tagIds.map((id) => names.get(id)).filter(Boolean).join('; '),
    row.firstSeenDate, row.dayDate, row.completedDate, row.canceledDate, progressDays(row), row.rondelCount, row.note,
  ])
  return '\uFEFF' + [headings, ...body].map((row) => row.map(csvCell).join(',')).join('\r\n')
}
