import type { ReportTaskRow as TaskRow } from '../../domain/reportTypes'
import type { Tag } from '../../domain/types'
import { LinkifiedText } from '../../shared/ui/LinkifiedText'
import { ReportContext } from './ReportContext'
import { progressDays, reportDate, reportDays, reportStatus } from './reportPresentation'
import './ReportTaskRow.css'

interface ReportTaskRowProps {
  row: TaskRow
  tags: Tag[]
  showNotes: boolean
  onOpen?: (id: string) => void
}

export function ReportTaskRow({ row, tags, showNotes, onOpen }: ReportTaskRowProps) {
  const days = progressDays(row)
  const inProgress = days !== null ? reportDays(days) : row.status === 'doing' || row.status === 'done' ? 'Unknown' : '—'
  return (
    <tr className={`report-task-row report-task-row--${row.status}`}>
      <th scope="row">
        <span className="report-task-title"><LinkifiedText text={row.title} /></span>
        <ReportContext tagIds={row.tagIds} tags={tags} />
        {onOpen && <button type="button" className="report-open-task" aria-label={`Open ${row.title}`} onClick={() => onOpen(row.id)}>Open task</button>}
        {row.note && showNotes && <div className="report-task-note">
          <ReportContext tagIds={[]} tags={tags} note={row.note} />
        </div>}
      </th>
      <td><strong>{reportStatus[row.status]}</strong></td>
      <td>{row.firstSeenDate ? reportDate(row.firstSeenDate) : '—'}</td>
      <td>{row.completedDate ? reportDate(row.completedDate) : '—'}</td>
      <td>{row.rondelCount}</td>
      <td>{inProgress}</td>
    </tr>
  )
}
