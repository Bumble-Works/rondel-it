import { useState } from 'react'
import { ensureNotificationPermission } from '../../shared/notify'
import { describeRecurrence } from '../../domain/recurrence'
import { formatClock, todayIso } from '../../domain/dates'
import { defaultRepeat } from '../../domain/repeat'
import type { RecurringRule, Tag } from '../../domain/types'
import type { RecurringRuleInput } from '../../services/adapters/DataSource'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import { InlineEditInput } from '../../shared/ui/InlineEditInput'
import { IconButton } from '../../shared/ui/IconButton'
import { TagChip } from '../../shared/ui/TagChip'
import { RepeatPicker, type RepeatChoice } from './RepeatPicker'
import './RecurringPage.css'

const newRepeat = (): RepeatChoice => ({ kind: 'repeat', repeat: defaultRepeat(todayIso()) })

interface RecurringPageProps {
  rules: RecurringRule[]
  tags: Tag[]
  onCreate: (input: RecurringRuleInput) => void
  onUpdateTitle: (id: string, title: string) => void
  onDelete: (id: string) => void
  onBack: () => void
}

export function RecurringPage({ rules, tags, onCreate, onUpdateTitle, onDelete, onBack }: RecurringPageProps) {
  const [title, setTitle] = useState('')
  const [repeat, setRepeat] = useState<RepeatChoice>(newRepeat)
  // Bumped on submit so the repeat picker starts over too.
  const [formKey, setFormKey] = useState(0)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [reminderTime, setReminderTime] = useState('')

  const tagsById = new Map(tags.map((t) => [t.id, t]))

  const toggleTag = (id: string) =>
    setTagIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const submit = () => {
    if (!title.trim()) return
    onCreate({
      title: title.trim(),
      kind: repeat.kind,
      repeat: repeat.kind === 'repeat' ? repeat.repeat : null,
      tagIds,
      reminderTime: reminderTime || null,
    })
    setTitle('')
    setTagIds([])
    setReminderTime('')
    setRepeat(newRepeat())
    setFormKey((k) => k + 1)
  }

  return (
    <div className="recurring">
      <div className="recurring-inner">
        <button type="button" className="recurring-back" onClick={onBack}>
          ← Back to tasks
        </button>
        <h1 className="recurring-title">
          <Icon name="repeat" size={24} /> Recurring
        </h1>
        <p className="recurring-lead">
          Rules generate a fresh, standalone task each time they come due. Editing a rule only affects
          future tasks — ones already on your list stay put.
        </p>
        <p className="recurring-lead">
          <strong>One at a time:</strong> the next one is only created once the last one is done. Until then,
          the open one keeps nagging you, and any days that come due meanwhile are skipped.
        </p>

        <section className="recurring-card">
          <h2>New recurring task</h2>

          <input
            className="field recurring-input"
            placeholder="Task title (e.g. Weekly review)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />

          <RepeatPicker key={formKey} onChange={setRepeat} />

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
            <Button variant="primary" disabled={!title.trim()} onClick={submit}>
              Add recurring task
            </Button>
          </div>
        </section>

        <section className="recurring-card">
          <h2>Your recurring tasks</h2>
          {rules.length === 0 ? (
            <p className="recurring-empty">No recurring tasks yet.</p>
          ) : (
            <ul className="recurring-list">
              {rules.map((rule) => (
                <li key={rule.id} className="recurring-item">
                  <span className="recurring-item-icon">
                    <Icon name="repeat" size={18} />
                  </span>
                  <div className="recurring-item-body">
                    <InlineEditInput
                      className="recurring-item-title"
                      aria-label="Recurring task title"
                      value={rule.title}
                      onCommit={(title) => onUpdateTitle(rule.id, title)}
                    />
                    <span className="recurring-item-desc">
                      {describeRecurrence(rule)}
                      {rule.reminderTime && <span> · 🔔 {formatClock(rule.reminderTime)}</span>}
                      {rule.tagIds.length > 0 && (
                        <span className="recurring-item-tags">
                          {rule.tagIds
                            .map((id) => tagsById.get(id))
                            .filter((t): t is Tag => Boolean(t))
                            .map((t) => (
                              <TagChip key={t.id} name={t.name} color={t.color} size="sm" />
                            ))}
                        </span>
                      )}
                    </span>
                  </div>
                  <IconButton icon="trash" label={`Delete ${rule.title}`} onClick={() => onDelete(rule.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
