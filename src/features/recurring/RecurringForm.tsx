import { useState } from 'react'
import { ensureNotificationPermission } from '../../shared/notify'
import { todayIso } from '../../domain/dates'
import { repeatOf } from '../../domain/recurrence'
import { defaultRepeat } from '../../domain/repeat'
import type { RecurringRule, Tag } from '../../domain/types'
import type { RecurringRuleInput } from '../../services/adapters/DataSource'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import { TagChip } from '../../shared/ui/TagChip'
import { RepeatPicker, type RepeatChoice } from './RepeatPicker'
import './RecurringForm.css'

interface RecurringFormProps {
  tags: Tag[]
  /** The rule being edited; a new rule when null. */
  rule: RecurringRule | null
  onSubmit: (input: RecurringRuleInput) => void
  onCancel: () => void
}

function choiceOf(rule: RecurringRule | null): RepeatChoice {
  if (rule?.kind === 'weekly-start' || rule?.kind === 'monthly-start') return { kind: rule.kind }
  return { kind: 'repeat', repeat: (rule && repeatOf(rule)) ?? defaultRepeat(todayIso()) }
}

/** New or edit recurring rule. Mount with a fresh `key` to start over. */
export function RecurringForm({ tags, rule, onSubmit, onCancel }: RecurringFormProps) {
  const [title, setTitle] = useState(rule?.title ?? '')
  const [initialRepeat] = useState(() => choiceOf(rule))
  const [repeat, setRepeat] = useState<RepeatChoice>(initialRepeat)
  const [tagIds, setTagIds] = useState<string[]>(rule?.tagIds ?? [])
  const [reminderTime, setReminderTime] = useState(rule?.reminderTime ?? '')
  const [flagged, setFlagged] = useState(rule?.flagged ?? false)

  const toggleTag = (id: string) =>
    setTagIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const submit = () => {
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      kind: repeat.kind,
      repeat: repeat.kind === 'repeat' ? repeat.repeat : null,
      tagIds,
      reminderTime: reminderTime || null,
      flagged,
    })
  }

  return (
    <section className={`recurring-card ${rule ? 'is-editing' : ''}`.trim()}>
      <h2>{rule ? 'Edit recurring task' : 'New recurring task'}</h2>

      <input
        className="field recurring-input"
        aria-label="Title"
        placeholder="Task title (e.g. Weekly review)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
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

      <div className="recurring-row">
        <span className="recurring-label">Flag</span>
        <button
          type="button"
          className={`recurring-flag ${flagged ? 'is-on' : ''}`.trim()}
          aria-pressed={flagged}
          aria-label="Flag each task as important"
          onClick={() => setFlagged((f) => !f)}
        >
          <Icon name={flagged ? 'flag-filled' : 'flag'} size={17} />
          {flagged ? 'Flagged' : 'Not flagged'}
        </button>
      </div>

      {tags.length > 0 && (
        <div className="recurring-tags">
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              name={tag.name}
              color={tag.color}
              size="sm"
              active={tagIds.includes(tag.id)}
              onClick={() => toggleTag(tag.id)}
            />
          ))}
        </div>
      )}

      <div className="recurring-actions">
        {rule && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button variant="primary" disabled={!title.trim()} onClick={submit}>
          {rule ? 'Save changes' : 'Add recurring task'}
        </Button>
      </div>
    </section>
  )
}
