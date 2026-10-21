import { useDroppable } from '@dnd-kit/core'
import { useState, type ReactNode } from 'react'
import { Icon } from '../../shared/ui/Icon'
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
  /** Set when tasks can be dropped here: below the rows (or on an empty section) goes last. */
  dropId?: string
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
  dropId,
  collapsible = true,
  hideTitle = false,
}: BoardSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isCollapsed = collapsible && collapsed
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dropId ?? '', disabled: !dropId })

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
        <div ref={setDropRef} className={`board-section-body ${isOver ? 'is-drop-target' : ''}`.trim()}>
          {empty ? <p className="board-section-empty">{emptyLabel}</p> : children}
        </div>
      )}
    </section>
  )
}
