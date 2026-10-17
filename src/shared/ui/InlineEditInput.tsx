import { useState, type InputHTMLAttributes } from 'react'

interface InlineEditInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'onKeyDown'> {
  value: string
  /** Called with the trimmed text when it changed and isn't empty. */
  onCommit: (value: string) => void
}

/** Text input that saves on blur or Enter (not per keystroke); Escape cancels. */
export function InlineEditInput({ value, onCommit, ...rest }: InlineEditInputProps) {
  const [text, setText] = useState(value)

  const commit = () => {
    const next = text.trim()
    if (next && next !== value) onCommit(next)
    setText(next || value)
  }

  return (
    <input
      {...rest}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setText(value)
      }}
    />
  )
}
