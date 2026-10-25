import type { CSSProperties } from 'react'
import { NEXT_STATUS_LABEL } from '../../domain/status'
import type { TaskStatus } from '../../domain/types'
import './StatusCircle.css'

interface StatusCircleProps {
  status: TaskStatus
  onClick?: () => void
  onDoubleClick?: () => void
  size?: number
  /** Optional accent color (e.g. from the task's primary tag). */
  accent?: string
  /** Render a non-interactive indicator (e.g. as a legend/label). */
  presentational?: boolean
  /** Disable interaction (e.g. a Bucket List dream with no date yet). */
  disabled?: boolean
  /** Tooltip explaining why it's disabled. */
  disabledTitle?: string
}

export function StatusCircle({
  status,
  onClick,
  onDoubleClick,
  size = 22,
  accent,
  presentational = false,
  disabled = false,
  disabledTitle = 'Give it a date to start',
}: StatusCircleProps) {
  const style = {
    width: size,
    height: size,
    ...(accent ? ({ '--circle-accent': accent } as CSSProperties) : {}),
  } as CSSProperties

  const marks = (
    <>
      <span className="status-circle-dot" />
      <svg className="status-circle-check" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5 10.5l3.2 3.2L15 6.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg className="status-circle-x" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M6 6l8 8M14 6l-8 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </>
  )

  if (presentational) {
    return (
      <span className={`status-circle status-circle--${status} status-circle--static`} style={style} aria-hidden="true">
        {marks}
      </span>
    )
  }

  return (
    <button
      type="button"
      className={`status-circle status-circle--${status}`}
      style={style}
      aria-label={NEXT_STATUS_LABEL[status]}
      title={disabled ? disabledTitle : NEXT_STATUS_LABEL[status]}
      aria-pressed={status === 'done'}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick?.()
      }}
    >
      {marks}
    </button>
  )
}
