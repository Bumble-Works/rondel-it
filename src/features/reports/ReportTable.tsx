import type { ReportTaskRow as TaskRow } from '../../domain/reportTypes'
import type { Tag } from '../../domain/types'
import { LinkifiedText } from '../../shared/ui/LinkifiedText'
import { TagChip } from '../../shared/ui/TagChip'
import { reportTableColumns, type ReportSort, type ReportSortDirection } from './reportTableColumns'
import './ReportTable.css'

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
        <thead><tr>{reportTableColumns.map((column) => <th key={column.key} scope="col" aria-sort={sort === column.key ? direction : undefined}>
          {onSort ? <button type="button" aria-label={`Sort by ${column.label}`} onClick={() => onSort(column.key)}>
            {column.label}<span aria-hidden="true">{sort === column.key ? direction === 'ascending' ? '↑' : '↓' : '↕'}</span>
          </button> : <span>{column.label}</span>}
        </th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.lineageId} className={`report-task-row report-task-row--${row.status}`}>
          {reportTableColumns.map((column) => column.key === 'title'
            ? <th scope="row" key={column.key}><TaskTitle row={row} tags={tags} showNotes={showNotes} onOpen={onOpenTask} /></th>
            : <td key={column.key}>{column.key === 'status' ? <strong>{column.text(row)}</strong> : column.text(row)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  )
}

function TaskTitle({ row, tags, showNotes, onOpen }: {
  row: TaskRow; tags: Tag[]; showNotes: boolean; onOpen?: (id: string) => void
}) {
  const attached = row.tagIds.flatMap((id) => {
    const tag = tags.find((item) => item.id === id)
    return tag ? [tag] : []
  })
  return <>
    <span className="report-task-title"><LinkifiedText text={row.title} /></span>
    {attached.length > 0 && <div className="report-context"><div className="report-context-tags">
      {attached.map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color} size="sm" />)}
    </div></div>}
    {onOpen && <button type="button" className="report-open-task" aria-label={`Open ${row.title}`} onClick={() => onOpen(row.id)}>Open task</button>}
    {row.note && showNotes && <div className="report-task-note"><div className="report-context">
      <p className="report-context-note"><LinkifiedText text={row.note} /></p>
    </div></div>}
  </>
}
