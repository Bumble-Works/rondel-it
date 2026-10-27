import type { ReportTaskRow } from '../../domain/reportTypes'
import type { Tag } from '../../domain/types'
import { reportStatus } from './reportPresentation'

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value)
  // Spreadsheet applications may execute a formula even inside quoted CSV.
  const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function reportCsv(rows: ReportTaskRow[], tags: Tag[]): string {
  const headings = ['Task', 'Status', 'Tags', 'Scheduled date', 'Completed date', 'Canceled date',
    'Days from first scheduled', 'Days from first started', 'Days in progress', 'Lifetime rondels',
    'Rondels while to do', 'Rondels while doing', 'From Bucket List', 'Rondels out of period',
    'Rondels into period', 'Rondels within period', 'Note', 'Task ID', 'Lineage ID']
  const body = rows.map((row) => [
    row.title, reportStatus[row.status], row.tagIds.map((id) => tags.find((tag) => tag.id === id)?.name).filter(Boolean).join('; '),
    row.dayDate, row.completedDate, row.canceledDate, row.plannedDays, row.startedDays, row.inProgressDays,
    row.rondelCount, row.todoRondelCount, row.doingRondelCount,
    row.bucketListOrigin === null ? 'Unknown' : row.bucketListOrigin ? 'Yes' : 'No',
    ...(['outgoing', 'incoming', 'within'] as const).map((direction) => row.flows.filter((flow) => flow.direction === direction).length),
    row.note, row.id, row.lineageId,
  ])
  return '\uFEFF' + [headings, ...body].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadReportCsv(rows: ReportTaskRow[], tags: Tag[], filename: string): void {
  const url = URL.createObjectURL(new Blob([reportCsv(rows, tags)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  try { link.click() } finally {
    link.remove()
    // Let the browser consume the URL before releasing the download's memory.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
