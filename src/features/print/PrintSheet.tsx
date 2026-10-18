import { createPortal } from 'react-dom'
import { formatDayLabel } from '../../domain/dates'
import { isCarriedForward } from '../../domain/rondel'
import type { Tag, Task } from '../../domain/types'
import './PrintSheet.css'

const STATUS: Record<Task['status'], { box: string; label: string }> = {
  todo: { box: '☐', label: 'To do' },
  doing: { box: '◐', label: 'Doing' },
  done: { box: '☑', label: 'Done' },
  canceled: { box: '☒', label: 'Canceled' },
}

interface PrintSheetProps {
  dayIso: string
  /** The day's tasks exactly as shown, filters applied. */
  tasks: Task[]
  tagsById: Map<string, Tag>
  /** e.g. "Tags: #work · Status: To do"; null when nothing is filtered. */
  filterSummary: string | null
}

/** Paper version of one day. Hidden on screen; the only thing printed. */
export function PrintSheet({ dayIso, tasks, tagsById, filterSummary }: PrintSheetProps) {
  return createPortal(
    <section className="print-sheet" aria-hidden="true">
      <header className="print-head">
        <h1>{formatDayLabel(dayIso)}</h1>
        <p>
          {tasks.length} task{tasks.length === 1 ? '' : 's'}
          {filterSummary ? ` · Filtered: ${filterSummary}` : ''}
        </p>
      </header>

      {tasks.length === 0 ? (
        <p className="print-empty">Nothing on this day.</p>
      ) : (
        <ol className="print-list">
          {tasks.map((task) => {
            const status = isCarriedForward(task)
              ? { box: '◐', label: 'Worked on, carried forward' }
              : STATUS[task.status]
            const tags = task.tagIds.map((id) => tagsById.get(id)).filter((t): t is Tag => Boolean(t))
            return (
              <li key={task.id} className={`print-task print-task--${task.status}`}>
                <span className="print-box">{status.box}</span>
                <div className="print-body">
                  <div className="print-title">
                    {task.flagged && <span className="print-flag">⚑ </span>}
                    {task.title}
                    <span className="print-status"> — {status.label}</span>
                  </div>
                  {tags.length > 0 && <div className="print-tags">{tags.map((t) => `#${t.name}`).join('  ')}</div>}
                  {task.note && <div className="print-note">{task.note}</div>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>,
    document.body,
  )
}
