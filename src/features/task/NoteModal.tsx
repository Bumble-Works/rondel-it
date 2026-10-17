import { useState } from 'react'
import type { Task } from '../../domain/types'
import { Button } from '../../shared/ui/Button'
import { Modal } from '../../shared/ui/Modal'
import './NoteModal.css'

interface NoteModalProps {
  open: boolean
  task: Task | null
  onClose: () => void
  onSave: (note: string) => void
}

export function NoteModal({ open, task, onClose, onSave }: NoteModalProps) {
  // The parent remounts this modal (via `key`) per task, so the draft starts
  // from the saved note.
  const [note, setNote] = useState(task?.note ?? '')

  if (!task) return null

  return (
    <Modal
      open={open}
      title="Note"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(note)
              onClose()
            }}
          >
            Save note
          </Button>
        </>
      }
    >
      <p className="note-modal-task">{task.title}</p>
      <textarea
        className="note-modal-input field"
        rows={7}
        autoFocus
        placeholder="Add context, blockers, links…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </Modal>
  )
}
