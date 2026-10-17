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
  onDropAtEnd?: () => void
  collapsible?: boolean
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
}: BoardSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isCollapsed = collapsible && collapsed

  return (
    <section className={`board-section board-section--${tone} ${highlight ? 'is-highlight' : ''}`.trim()}>
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
            <span className="board-section-titles">
              {eyebrow && <span className="board-section-eyebrow">{eyebrow}</span>}
              <span className="board-section-title">{title}</span>
            </span>
            {typeof count === 'number' && <span className="board-section-count">{count}</span>}
          </div>
        )}
        {headerRight && <div className="board-section-right">{headerRight}</div>}
      </header>

      {!isCollapsed && (
        <div
          className="board-section-body"
          onDragOver={onDropAtEnd ? (e) => e.preventDefault() : undefined}
          onDrop={
            onDropAtEnd
              ? (e) => {
                  e.preventDefault()
                  onDropAtEnd()
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
