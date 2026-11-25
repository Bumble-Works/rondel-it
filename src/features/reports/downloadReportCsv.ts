import type { ReportRange, ReportTaskRow } from '../../domain/reportTypes'
import type { Tag } from '../../domain/types'
import { downloadTextFile } from '../../shared/downloadTextFile'
import { reportCsv } from './reportCsv'

export async function downloadReportCsv(rows: ReportTaskRow[], tags: Tag[], range: ReportRange): Promise<void> {
  const filename = `rondel-report-${range.start}-${range.end}.csv`
  const csv = reportCsv(rows, tags)
  await downloadTextFile(filename, csv, 'text/csv;charset=utf-8', { name: 'CSV spreadsheet', extensions: ['csv'] })
}
