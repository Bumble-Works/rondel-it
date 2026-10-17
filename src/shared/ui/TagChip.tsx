import type { CSSProperties, KeyboardEvent } from 'react'
import './TagChip.css'

interface TagChipProps {
  name: string
  color: string
  size?: 'sm' | 'md'
  onRemove?: () => void
  onClick?: () => void
  active?: boolean
}

export function TagChip({ name, color, size = 'md', onRemove, onClick, active }: TagChipProps) {
  const style = {
    '--chip-color': color,
  } as CSSProperties

  const interactive = Boolean(onClick)

  return (
    <span
      className={`chip chip--${size} ${interactive ? 'chip--interactive' : ''} ${active ? 'chip--active' : ''}`.trim()}
      style={style}
      onClick={onClick}
      onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => {
        if (!interactive) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <span className="chip-dot" />
      <span className="chip-name">{name}</span>
      {onRemove && (
        <button
          type="button"
          className="chip-remove"
          aria-label={`Remove ${name}`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          ×
        </button>
      )}
    </span>
  )
}
