import type { ReportTaskRow as TaskRow } from '../../domain/reportTypes'
import type { Tag } from '../../domain/types'
import { ReportTaskRow } from './ReportTaskRow'
import type { ReportSort, ReportSortDirection } from './reportPresentation'
import './ReportTable.css'

const columns: { key: ReportSort; label: string }[] = [
  { key: 'title', label: 'Task' }, { key: 'status', label: 'Status' },
  { key: 'first-seen', label: 'First seen' }, { key: 'completed', label: 'Completed' },
  { key: 'rondels', label: 'Rondels' }, { key: 'in-progress', label: 'Days in progress' },
]

interface ReportTableProps {
  rows: TaskRow[]
  tags: Tag[]
  showNotes: boolean
  sort: ReportSort
  direction: ReportSortDirection
  onSort?: (sort: ReportSort) => void
  onOpenTask?: (id: string) => void
}

export function ReportTable({ rows, tags, showNotes, sort, direction, onSort, onOpenTask }: ReportTableProps) {
  return (
    <div className="report-table-scroll" role="region" aria-label="Scrollable task details" tabIndex={0}>
      <table aria-label="Tasks">
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col" aria-sort={sort === column.key ? direction : undefined}>
          {onSort ? <button type="button" aria-label={`Sort by ${column.label}`} onClick={() => onSort(column.key)}>
            {column.label}<span aria-hidden="true">{sort === column.key ? direction === 'ascending' ? '↑' : '↓' : '↕'}</span>
          </button> : <span>{column.label}</span>}
        </th>)}</tr></thead>
        <tbody>{rows.map((row) => <ReportTaskRow key={row.lineageId} row={row} tags={tags} showNotes={showNotes} onOpen={onOpenTask} />)}</tbody>
      </table>
    </div>
  )
}
