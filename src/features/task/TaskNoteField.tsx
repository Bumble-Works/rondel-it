import { useState } from 'react'
import './TaskNoteField.css'

interface TaskNoteFieldProps {
  note: string
  onSave: (note: string) => void
}

/** Keyed by task so an unfinished draft never follows selection to another task. */
export function TaskNoteField({ note, onSave }: TaskNoteFieldProps) {
  const [draft, setDraft] = useState(note)
  return <section className="task-note-field" aria-label="Task note">
    <label className="detail-field-label" htmlFor="detail-note">Note</label>
    <textarea id="detail-note" className="detail-note field" rows={6}
      placeholder="Add context, blockers, links…" value={draft}
      onChange={event => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== note) onSave(draft)
      }} />
  </section>
}
