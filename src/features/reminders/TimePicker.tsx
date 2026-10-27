import { useId, useState } from 'react'
import { formatClock } from '../../domain/dates'
import { Icon } from '../../shared/ui/Icon'
import { Menu } from '../../shared/ui/Menu'
import './TimePicker.css'

interface TimePickerProps {
  value: string | null
  onChange: (time: string | null) => void
  disabledReason?: string | null
}

export function TimePicker({ value, onChange, disabledReason }: TimePickerProps) {
  const id = useId()
  const [draft, setDraft] = useState(value ?? '')
  return (
    <Menu
      align="left"
      trigger={({ onClick, 'aria-expanded': expanded }) => (
        <button
          type="button"
          className="time-picker-trigger"
          aria-label={value ? `Change time: ${formatClock(value)}` : 'Add time'}
          aria-expanded={expanded}
          disabled={Boolean(disabledReason)}
          title={disabledReason ?? 'Reminder time'}
          onClick={(e) => {
            setDraft(value ?? '')
            onClick(e)
          }}
        >
          <Icon name="bell" size={13} />
          {value ? formatClock(value) : 'Time'}
        </button>
      )}
    >
      {(close) => (
        <form
          className="time-picker-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!draft) return
            onChange(draft)
            close()
          }}
        >
          <label htmlFor={id}>Reminder time</label>
          <input id={id} type="time" className="field" value={draft} required autoFocus onChange={(e) => setDraft(e.target.value)} />
          <div className="time-picker-actions">
            {value && (
              <button type="button" onClick={() => {
                onChange(null)
                close()
              }}>Remove</button>
            )}
            <button type="submit" disabled={!draft}>Set time</button>
          </div>
        </form>
      )}
    </Menu>
  )
}
