import { useState, type ReactNode } from 'react'
import { Icon } from '../../shared/ui/Icon'
import { acceptTaskDrop, droppedTaskId } from './taskDrag'
import './BoardSection.css'

interface BoardSectionProps {
  title: string
  eyebrow?: string
  count?: number
  highlight?: boolean
  tone?: 'day' | 'bucket'
  defaultCollapsed?: boolean
  headerRight?: ReactNode
  children: ReactNode
  empty?: boolean
  emptyLabel?: string
  /** A task dropped below the rows (or on an empty section) goes last. */
  onDropAtEnd?: (taskId: string) => void
  collapsible?: boolean
  /** Hide the title when the page header already says it (Day, Bucket List views). */
  hideTitle?: boolean
}

export function BoardSection({
  title,
  eyebrow,
  count,
  highlight,
  tone = 'day',
  defaultCollapsed = false,
  headerRight,
  children,
  empty,
  emptyLabel = 'Nothing here',
  onDropAtEnd,
  collapsible = true,
  hideTitle = false,
}: BoardSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isCollapsed = collapsible && collapsed

  return (
    <section
      className={`board-section board-section--${tone} ${highlight ? 'is-highlight' : ''} ${hideTitle ? 'is-untitled' : ''}`.trim()}
      aria-label={hideTitle ? title : undefined}
    >
      <header className="board-section-head">
        {collapsible ? (
          <button
            type="button"
            className="board-section-toggle"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
          >
            <span className={`board-section-caret ${collapsed ? 'is-collapsed' : ''}`.trim()}>
              <Icon name="chevron-down" size={16} />
            </span>
            <span className="board-section-titles">
              {eyebrow && <span className="board-section-eyebrow">{eyebrow}</span>}
              <span className="board-section-title">{title}</span>
            </span>
            {typeof count === 'number' && <span className="board-section-count">{count}</span>}
          </button>
        ) : (
          <div className="board-section-toggle board-section-toggle--static">
            {!hideTitle && (
              <span className="board-section-titles">
                {eyebrow && <span className="board-section-eyebrow">{eyebrow}</span>}
                <span className="board-section-title">{title}</span>
              </span>
            )}
            {typeof count === 'number' &&
              (hideTitle ? (
                <span className="board-section-tally">
                  {count} {count === 1 ? 'task' : 'tasks'}
                </span>
              ) : (
                <span className="board-section-count">{count}</span>
              ))}
          </div>
        )}
        {headerRight && <div className="board-section-right">{headerRight}</div>}
      </header>

      {!isCollapsed && (
        <div
          className="board-section-body"
          onDragOver={onDropAtEnd ? (e) => void acceptTaskDrop(e) : undefined}
          onDrop={
            onDropAtEnd
              ? (e) => {
                  const draggedId = droppedTaskId()
                  if (!draggedId) return
                  e.preventDefault()
                  onDropAtEnd(draggedId)
                }
              : undefined
          }
        >
          {empty ? <p className="board-section-empty">{emptyLabel}</p> : children}
        </div>
      )}
    </section>
  )
}
