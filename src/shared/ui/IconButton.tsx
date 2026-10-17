import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'
import './IconButton.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  size?: number
  tone?: 'default' | 'active'
}

export function IconButton({
  icon,
  label,
  size = 18,
  tone = 'default',
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn icon-btn--${tone} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}
