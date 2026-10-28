import type { ReportTaskRow } from '../../domain/reportTypes'
import type { Tag } from '../../domain/types'
import { isDesktopApp } from '../../services/sync/folder'
import { reportCsv, type ReportCsvContext } from './reportCsv'

export async function downloadReportCsv(rows: ReportTaskRow[], tags: Tag[], context: ReportCsvContext): Promise<void> {
  const filename = `rondel-report-${context.range.start}-${context.range.end}.csv`
  const csv = reportCsv(rows, tags)
  if (isDesktopApp()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({ defaultPath: filename, filters: [{ name: 'CSV spreadsheet', extensions: ['csv'] }] })
    if (path === null) return
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    await writeTextFile(path, csv)
    return
  }
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
  } finally {
    link.remove()
    // Allow the browser to consume the download before releasing its memory.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
