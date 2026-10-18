import { useState } from 'react'
import { ensureNotificationPermission } from '../../shared/notify'
import { describeRecurrence } from '../../domain/recurrence'
import { weekdayName } from '../../domain/dates'
import type { RecurrenceKind, RecurringRule, Tag } from '../../domain/types'
import type { RecurringRuleInput } from '../../services/adapters/DataSource'
import { Button } from '../../shared/ui/Button'
import { Icon } from '../../shared/ui/Icon'
import { InlineEditInput } from '../../shared/ui/InlineEditInput'
import { IconButton } from '../../shared/ui/IconButton'
import { TagChip } from '../../shared/ui/TagChip'
import './RecurringPage.css'

function clampDayOfMonth(text: string): number {
  const day = Math.round(Number(text))
  return Number.isFinite(day) ? Math.min(31, Math.max(1, day)) : 1
}

const KIND_OPTIONS: Array<{ value: RecurrenceKind; label: string }> = [
  { value: 'weekly-on', label: 'Every week on a weekday' },
  { value: 'monthly-on', label: 'Every month on a date' },
  { value: 'weekly-start', label: 'Start of every week, rondeled into that week' },
  { value: 'monthly-start', label: 'Start of every month, rondeled into that month' },
]

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
  const [kind, setKind] = useState<RecurrenceKind>('weekly-on')
  const [weekday, setWeekday] = useState(1)
  // Kept as text so the field can be cleared while typing; clamped on blur/submit.
  const [dayOfMonthText, setDayOfMonthText] = useState('1')
  const dayOfMonth = clampDayOfMonth(dayOfMonthText)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [reminderTime, setReminderTime] = useState('')

  const tagsById = new Map(tags.map((t) => [t.id, t]))

  const toggleTag = (id: string) =>
    setTagIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const submit = () => {
    if (!title.trim()) return
    onCreate({
      title: title.trim(),
      kind,
      weekday: kind === 'weekly-on' ? weekday : null,
      dayOfMonth: kind === 'monthly-on' ? dayOfMonth : null,
      tagIds,
      reminderTime: reminderTime || null,
    })
    setTitle('')
    setTagIds([])
    setReminderTime('')
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

        <section className="recurring-card">
          <h2>New recurring task</h2>

          <input
            className="field recurring-input"
            placeholder="Task title (e.g. Weekly review)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />

          <div className="recurring-row">
            <label htmlFor="recur-kind">Repeats</label>
            <select
              id="recur-kind"
              className="field recurring-control"
              value={kind}
              onChange={(e) => setKind(e.target.value as RecurrenceKind)}
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {kind === 'weekly-on' && (
            <div className="recurring-row">
              <label htmlFor="recur-weekday">On</label>
              <select
                id="recur-weekday"
                className="field recurring-control"
                value={weekday}
                onChange={(e) => setWeekday(Number(e.target.value))}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>
                    {weekdayName(d)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {kind === 'monthly-on' && (
            <div className="recurring-row">
              <label htmlFor="recur-dom">On day</label>
              <input
                id="recur-dom"
                type="number"
                min={1}
                max={31}
                className="field recurring-control"
                value={dayOfMonthText}
                onChange={(e) => setDayOfMonthText(e.target.value)}
                onBlur={() => setDayOfMonthText(String(dayOfMonth))}
              />
            </div>
          )}

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
                      {describeRecurrence(rule.kind, rule.weekday, rule.dayOfMonth)}
                      {rule.reminderTime && <span> · 🔔 {rule.reminderTime}</span>}
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
