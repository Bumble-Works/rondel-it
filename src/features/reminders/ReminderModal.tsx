import type { ComponentProps } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { ReminderList } from './ReminderList'

interface ReminderModalProps extends ComponentProps<typeof ReminderList> {
  open: boolean
  onClose: () => void
}

/** The browser's reminder pop-up (the Mac app uses its own window: ReminderPopup). */
export function ReminderModal({ open, onClose, ...list }: ReminderModalProps) {
  return (
    <Modal open={open} title="Reminder" onClose={onClose} width={520}>
      <ReminderList {...list} />
    </Modal>
  )
}
