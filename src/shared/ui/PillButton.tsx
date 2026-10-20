import type { ButtonHTMLAttributes } from 'react'
import './PillButton.css'

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 'done' is tinted green, for marking a task done. */
  tone?: 'default' | 'done'
}

/** A small rounded action button, for rows of quick choices on a task. */
export function PillButton({ tone = 'default', className = '', ...rest }: PillButtonProps) {
  return <button type="button" className={`pill-btn pill-btn--${tone} ${className}`.trim()} {...rest} />
}
