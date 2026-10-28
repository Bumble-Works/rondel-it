import { useState } from 'react'
import type { ReportTaskRow } from '../../domain/reportTypes'
import type { Tag } from '../../domain/types'
import { Button } from '../../shared/ui/Button'
import { downloadReportCsv } from './downloadReportCsv'
import type { ReportCsvContext } from './reportCsv'
import './ReportExportButton.css'

interface ReportExportButtonProps {
  rows: ReportTaskRow[]
  tags: Tag[]
  context: ReportCsvContext
  onError: (context: string, error: unknown) => void
}

export function ReportExportButton({ rows, tags, context, onError }: ReportExportButtonProps) {
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true)
    try { await downloadReportCsv(rows, tags, context) }
    catch (error) { onError('Couldn’t export report CSV', error) }
    finally { setBusy(false) }
  }
  return <Button className="report-export-button" size="sm" disabled={busy || !rows.length} onClick={() => void download()}
    title="Export all matching tasks and their reporting data">Export CSV</Button>
}
