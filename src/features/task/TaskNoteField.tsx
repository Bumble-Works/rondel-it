import { useState } from 'react'
import { LinkifiedText } from '../../shared/ui/LinkifiedText'
import './TaskNoteField.css'

interface TaskNoteFieldProps {
  note: string
  onSave: (note: string) => void
}

/** Keyed by task so an unfinished draft never follows selection to another task. */
export function TaskNoteField({ note, onSave }: TaskNoteFieldProps) {
  const [draft, setDraft] = useState(note)
  const [editing, setEditing] = useState(!note)
  return <section className="task-note-field" aria-label="Task note">
    {editing ? <>
      <label className="detail-field-label" htmlFor="detail-note">Note</label>
      <textarea id="detail-note" className="detail-note field" rows={6}
        placeholder="Add context, blockers, links…" value={draft} autoFocus
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== note) onSave(draft)
          setEditing(false)
        }} />
    </> : <>
      <span className="detail-field-label">Note</span>
      <div className="task-note-reading"><LinkifiedText text={note} /></div>
      <button type="button" className="task-note-edit" onClick={() => { setDraft(note); setEditing(true) }}>
        {note ? 'Edit note' : 'Add note'}
      </button>
    </>}
  </section>
}
