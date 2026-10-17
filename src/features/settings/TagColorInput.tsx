import { useState } from 'react'

interface TagColorInputProps {
  value: string
  label: string
  className?: string
  onCommit: (color: string) => void
}

/** Color picker that previews while dragging and saves once, on blur. */
export function TagColorInput({ value, label, className, onCommit }: TagColorInputProps) {
  const [color, setColor] = useState(value)
  return (
    <input
      type="color"
      className={className}
      aria-label={label}
      value={color}
      onChange={(e) => setColor(e.target.value)}
      onBlur={() => color !== value && onCommit(color)}
    />
  )
}
