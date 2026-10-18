import { createPortal } from 'react-dom'
import { isCarriedForward } from '../../domain/rondel'
import type { Tag, Task } from '../../domain/types'
import './PrintSheet.css'

// Round, like the app's status circles.
const STATUS: Record<Task['status'], { mark: string; label: string }> = {
  todo: { mark: '○', label: 'To do' },
  doing: { mark: '◐', label: 'Doing' },
  done: { mark: '●', label: 'Done' },
  canceled: { mark: '⊘', label: 'Canceled' },
}

export interface PrintSection {
  key: string
  /** e.g. "Monday, October 19" or "Unassigned". */
  heading: string
  /** The section's tasks exactly as shown, filters applied. */
  tasks: Task[]
}

interface PrintSheetProps {
  /** e.g. "Monday, October 19", "Week of Oct 12 – Oct 18", "October 2026", "Bucket List". */
  title: string
  /** What the view shows, in paper order (empty sections left out). */
  sections: PrintSection[]
  /** Head each section (a week or month always does, even with one day). */
  showHeadings: boolean
  tagsById: Map<string, Tag>
  /** e.g. "Tags: #work · Status: To do"; null when nothing is filtered. */
  filterSummary: string | null
}

/** Paper version of the current view. Hidden on screen; the only thing printed. */
export function PrintSheet({ title, sections, showHeadings, tagsById, filterSummary }: PrintSheetProps) {
  const total = sections.reduce((sum, section) => sum + section.tasks.length, 0)

  return createPortal(
    <section className="print-sheet" aria-hidden="true">
      <header className="print-head">
        <h1>{title}</h1>
        <p>
          {total} task{total === 1 ? '' : 's'}
          {filterSummary ? ` · Filtered: ${filterSummary}` : ''}
        </p>
      </header>

      {total === 0 ? (
        <p className="print-empty">Nothing to print.</p>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="print-day">
            {showHeadings && <h2>{section.heading}</h2>}
            <PrintTaskList tasks={section.tasks} tagsById={tagsById} />
          </section>
        ))
      )}
    </section>,
    document.body,
  )
}

function PrintTaskList({ tasks, tagsById }: { tasks: Task[]; tagsById: Map<string, Tag> }) {
  return (
    <ol className="print-list">
      {tasks.map((task) => {
        const status = isCarriedForward(task) ? { mark: '◐', label: 'Worked on, carried forward' } : STATUS[task.status]
        const tags = task.tagIds.map((id) => tagsById.get(id)).filter((t): t is Tag => Boolean(t))
        return (
          <li key={task.id} className={`print-task print-task--${task.status}`}>
            <span className="print-box">{status.mark}</span>
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
  )
}
