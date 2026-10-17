import { useState } from 'react'
import { addDays, todayIso } from '../../domain/dates'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'
import './DatePickModal.css'

interface DatePickModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (dateIso: string) => void
}

export function DatePickModal({ open, onClose, onConfirm }: DatePickModalProps) {
  // The parent remounts this modal (via `key`) each time it opens, so the
  // date always starts fresh at tomorrow.
  const [date, setDate] = useState(() => addDays(todayIso(), 1))
  // A cleared input yields '' — moving a task there would hide it from every view.
  const isValid = date !== '' && date >= todayIso()

  return (
    <Modal
      open={open}
      title="Rondel to a specific date"
      width={380}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!isValid} onClick={() => isValid && onConfirm(date)}>
            Rondel it
          </Button>
        </>
      }
    >
      <label className="datepick-label" htmlFor="datepick-input">
        Move this task to
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
