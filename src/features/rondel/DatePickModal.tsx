import { useState } from 'react'
import { addDays, todayIso } from '../../domain/dates'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'
import './DatePickModal.css'

const TEXT = {
  rondel: { title: 'Rondel to a specific date', label: 'Move this task to', confirm: 'Rondel it' },
  copy: { title: 'Copy to a date', label: 'Add a new to-do copy on', confirm: 'Copy it' },
}

interface DatePickModalProps {
  open: boolean
  /** Rondel the task to the date, or copy it there. */
  purpose?: keyof typeof TEXT
  onClose: () => void
  onConfirm: (dateIso: string) => void
}

export function DatePickModal({ open, purpose = 'rondel', onClose, onConfirm }: DatePickModalProps) {
  const text = TEXT[purpose]
  // The parent remounts this modal (via `key`) each time it opens, so the
  // date always starts fresh at tomorrow.
  const [date, setDate] = useState(() => addDays(todayIso(), 1))
  // A cleared input yields '' — moving a task there would hide it from every view.
  const isValid = date !== '' && date >= todayIso()

  return (
    <Modal
      open={open}
      title={text.title}
      width={380}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!isValid} onClick={() => isValid && onConfirm(date)}>
            {text.confirm}
          </Button>
        </>
      }
    >
      <label className="datepick-label" htmlFor="datepick-input">
        {text.label}
      </label>
      <input
        id="datepick-input"
        type="date"
        className="field"
        min={todayIso()}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
    </Modal>
  )
}
