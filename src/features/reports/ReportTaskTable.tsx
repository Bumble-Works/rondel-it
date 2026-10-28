import { useMemo, useState } from 'react'
import type { ReportRange, ReportTaskRow as TaskRow } from '../../domain/reportTypes'
import type { Tag, TaskStatus } from '../../domain/types'
import { toggleStatusFilter } from '../../shared/taskStatus'
import { ReportPager } from './ReportPager'
import { ReportTable } from './ReportTable'
import { ReportPrint } from './ReportPrint'
import { Button } from '../../shared/ui/Button'
import { downloadReportCsv } from './downloadReportCsv'
import { ReportStatusFilters } from './ReportStatusFilters'
import { reportStatus } from './reportPresentation'
import { defaultReportSortDirection, sortReportRows, type ReportSort, type ReportSortDirection } from './reportTableColumns'
import { useReportPagination } from './useReportPagination'
import './ReportTaskTable.css'

interface ReportTaskTableProps {
  rows: TaskRow[]
  tags: Tag[]
  selection: string
  output?: { range: ReportRange; summary: string; title: string; onError: (context: string, error: unknown) => void }
  onOpenTask?: (id: string) => void
}

export function ReportTaskTable({ rows, tags, selection, onOpenTask, output }: ReportTaskTableProps) {
  const [exporting, setExporting] = useState(false)
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [showNotes, setShowNotes] = useState(false)
  const [sort, setSort] = useState<ReportSort>('rondels')
  const [direction, setDirection] = useState<ReportSortDirection>('descending')
  const matching = useMemo(() => sortReportRows(rows.filter((row) =>
    statuses.length === 0 || statuses.includes(row.status)), sort, direction), [rows, statuses, sort, direction])
  const pagination = useReportPagination(matching.length, JSON.stringify([selection, statuses, sort, direction]))
  const summary = output ? `${output.summary} · ${statuses.length ? `Status: ${statuses.map((status) => reportStatus[status]).join(', ')}` : 'All statuses'} · ${matching.length} tasks` : ''
  const changeSort = (key: ReportSort) => {
    setSort(key)
    setDirection(key === sort ? direction === 'ascending' ? 'descending' : 'ascending' : defaultReportSortDirection(key))
  }
  const exportCsv = async () => {
    if (!output) return
    setExporting(true)
    try { await downloadReportCsv(matching, tags, output.range) }
    catch (error) { output.onError('Couldn’t export report CSV', error) }
    finally { setExporting(false) }
  }
  return (
    <div className="report-task-table">
      <div className="report-table-tools">
        <ReportStatusFilters selected={statuses} onToggle={(status) => setStatuses((current) => toggleStatusFilter(current, status))} onClear={() => setStatuses([])} />
        {output && <div className="report-output-actions">
          <ReportPrint title={output.title} summary={summary} onError={output.onError} renderContent={() =>
            matching.length ? <ReportTable rows={matching} tags={tags} showNotes={showNotes} sort={sort} direction={direction} />
              : <p>Nothing to print.</p>} />
          <Button className="report-export-button" size="sm" disabled={exporting || !matching.length} onClick={() => void exportCsv()}
            title="Export all matching tasks and their reporting data">Export CSV</Button>
        </div>}
        <label><input type="checkbox" checked={showNotes} onChange={(event) => setShowNotes(event.target.checked)} />Show notes</label>
      </div>
      {matching.length === 0 ? <p className="reports-no-activity">No tasks match these dates, tags and status.</p> : <ReportTable rows={matching.slice(pagination.start, pagination.end)} tags={tags} showNotes={showNotes}
          sort={sort} direction={direction} onSort={changeSort} onOpenTask={onOpenTask} />}
      <ReportPager pagination={pagination} label="Task table pages" unit="tasks" />
    </div>
  )
}
