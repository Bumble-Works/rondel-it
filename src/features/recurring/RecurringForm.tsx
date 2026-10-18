import { useState } from 'react'
import { ensureNotificationPermission } from '../../shared/notify'
import { todayIso } from '../../domain/dates'
import { repeatOf } from '../../domain/recurrence'
import { defaultRepeat } from '../../domain/repeat'
import type { RecurringRule, Tag } from '../../domain/types'
import type { RecurringRuleInput } from '../../services/adapters/DataSource'
import { Button } from '../../shared/ui/Button'
import { IconButton } from '../../shared/ui/IconButton'
import { HashTagTextField } from '../tags/HashTagTextField'
import { TagPicker } from '../tags/TagPicker'
import { useHashTagInput } from '../tags/useHashTagInput'
import { TaskLinks } from '../task/TaskLinks'
import { RepeatPicker, type RepeatChoice } from './RepeatPicker'
import './RecurringForm.css'

interface RecurringFormProps {
  tags: Tag[]
  /** The rule being edited; a new rule when null. */
  rule: RecurringRule | null
  onSubmit: (input: RecurringRuleInput) => void
  onCancel: () => void
  onCreateTag: (name: string) => Promise<Tag | null>
}

function choiceOf(rule: RecurringRule | null): RepeatChoice {
  if (rule?.kind === 'weekly-start' || rule?.kind === 'monthly-start') return { kind: rule.kind }
  return { kind: 'repeat', repeat: (rule && repeatOf(rule)) ?? defaultRepeat(todayIso()) }
}

/** New or edit recurring rule, with the task side panel's title, tags, flag and note. Remount (`key`) to start over. */
export function RecurringForm({ tags, rule, onSubmit, onCancel, onCreateTag }: RecurringFormProps) {
  const titleInput = useHashTagInput<HTMLTextAreaElement>({ tags, onCreateTag, initialText: rule?.title, initialTagIds: rule?.tagIds })
  const [initialRepeat] = useState(() => choiceOf(rule))
  const [repeat, setRepeat] = useState<RepeatChoice>(initialRepeat)
  const [note, setNote] = useState(rule?.note ?? '')
  const [reminderTime, setReminderTime] = useState(rule?.reminderTime ?? '')
  const [flagged, setFlagged] = useState(rule?.flagged ?? false)

  const submit = () => {
    if (!titleInput.text.trim()) return
    onSubmit({
      title: titleInput.text.trim(),
      kind: repeat.kind,
      repeat: repeat.kind === 'repeat' ? repeat.repeat : null,
      tagIds: titleInput.tagIds,
      note,
      reminderTime: reminderTime || null,
      flagged,
    })
  }

  return (
    <section className={`recurring-card ${rule ? 'is-editing' : ''}`.trim()}>
      <div className="recurring-form-head">
        <h2>{rule ? 'Edit recurring task' : 'New recurring task'}</h2>
        <IconButton
          icon={flagged ? 'flag-filled' : 'flag'}
          label={flagged ? 'Remove flag' : 'Flag as important'}
          className={flagged ? 'recurring-flag is-on' : 'recurring-flag'}
          aria-pressed={flagged}
          onClick={() => setFlagged((f) => !f)}
        />
      </div>

      {/* The same title box as the side panel: #tags and long links behave alike. */}
      <HashTagTextField
        input={titleInput}
        className="field recurring-input"
        aria-label="Title"
        placeholder="Task title (e.g. Weekly review #home)"
        onEnter={submit}
      />

      <TagPicker
        className="recurring-tags"
        tags={tags}
        selectedIds={titleInput.tagIds}
        onToggle={titleInput.toggleTag}
        onCreate={async (name) => {
          const tag = await onCreateTag(name)
          if (tag) titleInput.toggleTag(tag.id) // a new tag, so this adds it
        }}
      />

      <RepeatPicker initial={initialRepeat} onChange={setRepeat} />

      <div className="recurring-row">
        <label htmlFor="recur-reminder">Reminder</label>
        <input
          id="recur-reminder"
          type="time"
          className="field recurring-control"
          value={reminderTime}
          onChange={(e) => {
            setReminderTime(e.target.value)
            if (e.target.value) void ensureNotificationPermission()
          }}
        />
      </div>

      <label className="recurring-label" htmlFor="recur-note">
        Note
      </label>
      <textarea
        id="recur-note"
        className="field recurring-note"
        rows={3}
        placeholder="Copied onto each task: context, links…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <TaskLinks text={`${titleInput.text}\n${note}`} />

      <div className="recurring-actions">
        {rule && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button variant="primary" disabled={!titleInput.text.trim()} onClick={submit}>
          {rule ? 'Save changes' : 'Add recurring task'}
        </Button>
      </div>
    </section>
  )
}
