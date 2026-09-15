import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'secondary', size = 'md', className = '', ...rest }: ButtonProps) {
  return <button className={`btn btn--${variant} btn--${size} ${className}`.trim()} {...rest} />
}
