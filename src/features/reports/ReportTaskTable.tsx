import { useMemo, useState } from 'react'
import type { ReportTaskRow as TaskRow } from '../../domain/reportTypes'
import type { Tag, TaskStatus } from '../../domain/types'
import { toggleStatusFilter } from '../../shared/taskStatus'
import { ReportPager } from './ReportPager'
import { ReportTaskRow } from './ReportTaskRow'
import { ReportStatusFilters } from './ReportStatusFilters'
import { sortReportRows, type ReportSort, type ReportSortDirection } from './reportPresentation'
import { useReportPagination } from './useReportPagination'
import './ReportTaskTable.css'

const columns: { key: ReportSort; label: string }[] = [
  { key: 'title', label: 'Task' }, { key: 'status', label: 'Status' },
  { key: 'first-seen', label: 'First seen' }, { key: 'completed', label: 'Completed' },
  { key: 'rondels', label: 'Rondels' }, { key: 'in-progress', label: 'Days in progress' },
]

interface ReportTaskTableProps {
  rows: TaskRow[]
  tags: Tag[]
  selection: string
  onOpenTask?: (id: string) => void
}

export function ReportTaskTable({ rows, tags, selection, onOpenTask }: ReportTaskTableProps) {
  const [statuses, setStatuses] = useState<TaskStatus[]>([])
  const [showNotes, setShowNotes] = useState(false)
  const [sort, setSort] = useState<ReportSort>('rondels')
  const [direction, setDirection] = useState<ReportSortDirection>('descending')
  const matching = useMemo(() => sortReportRows(rows.filter((row) =>
    statuses.length === 0 || statuses.includes(row.status)), sort, direction), [rows, statuses, sort, direction])
  const pagination = useReportPagination(matching.length, JSON.stringify([selection, statuses, sort, direction]))
  const changeSort = (key: ReportSort) => {
    setSort(key)
    setDirection(key === sort ? direction === 'ascending' ? 'descending' : 'ascending' : key === 'title' ? 'ascending' : 'descending')
  }
  return (
    <div className="report-task-table">
      <div className="report-table-tools">
        <ReportStatusFilters selected={statuses} onToggle={(status) => setStatuses((current) => toggleStatusFilter(current, status))} onClear={() => setStatuses([])} />
        <label><input type="checkbox" checked={showNotes} onChange={(event) => setShowNotes(event.target.checked)} />Show notes</label>
      </div>
      {matching.length === 0 ? <p className="reports-no-activity">No tasks match these dates, tags and status.</p> : <>
        <div className="report-table-scroll" role="region" aria-label="Scrollable task details" tabIndex={0}>
          <table aria-label="Tasks">
            <thead><tr>{columns.map((column) => <th key={column.key} scope="col" aria-sort={sort === column.key ? direction : undefined}>
              <button type="button" aria-label={`Sort by ${column.label}`} onClick={() => changeSort(column.key)}>
                {column.label}<span aria-hidden="true">{sort === column.key ? direction === 'ascending' ? '↑' : '↓' : '↕'}</span>
              </button>
            </th>)}</tr></thead>
            <tbody>{matching.slice(pagination.start, pagination.end).map((row) => <ReportTaskRow key={row.lineageId} row={row} tags={tags} showNotes={showNotes} onOpen={onOpenTask} />)}</tbody>
          </table>
        </div>
      </>}
      <ReportPager pagination={pagination} label="Task table pages" unit="tasks" />
    </div>
  )
}
