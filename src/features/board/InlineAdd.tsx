import { useState } from 'react'
import { Icon } from '../../shared/ui/Icon'
import './InlineAdd.css'

interface InlineAddProps {
  onAdd: (title: string) => void
  placeholder?: string
}

export function InlineAdd({ onAdd, placeholder = 'Add a task' }: InlineAddProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const title = value.trim()
    if (!title) return
    onAdd(title)
    setValue('')
  }

  return (
    <div className={`inline-add ${value ? 'is-active' : ''}`.trim()}>
      <span className="inline-add-icon">
        <Icon name="plus" size={16} />
      </span>
      <input
        className="inline-add-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') setValue('')
        }}
        onBlur={submit}
      />
    </div>
  )
}
