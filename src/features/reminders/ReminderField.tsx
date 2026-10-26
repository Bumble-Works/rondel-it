import { useState } from 'react'
import { canRemind } from '../../domain/rondel'
import type { Task } from '../../domain/types'
import { ensureNotificationPermission } from '../../shared/notify'
import { ChoiceModal } from '../../shared/ui/ChoiceModal'
import './ReminderField.css'

export type ReminderScope = 'one' | 'all'

interface ReminderFieldProps {
  task: Task
  onChange: (reminderTime: string | null, scope: ReminderScope) => void
}

/** Reminder time on the task's day. On a recurring task, asks: only this one, or all? */
export function ReminderField({ task, onChange }: ReminderFieldProps) {
  const [time, setTime] = useState(task.reminderTime ?? '')
  // A change waiting for the "only this one / all" answer.
  const [pending, setPending] = useState<{ value: string | null } | null>(null)

  const commit = (value: string | null) => {
    if (value === task.reminderTime) return
    // Ask now, while the user is acting, so the macOS prompt makes sense.
    if (value) void ensureNotificationPermission()
    if (task.recurringRuleId) setPending({ value })
    else onChange(value, 'one')
  }

  return (
    <div className="reminder-field">
      <label className="detail-field-label" htmlFor="reminder-time">
        Reminder
      </label>
      {canRemind(task) ? (
        <div className="reminder-row">
          <input
            id="reminder-time"
            type="time"
            className="field reminder-input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onBlur={() => commit(time || null)}
          />
          {task.reminderTime && (
            <button
              type="button"
              className="reminder-clear"
              onClick={() => {
                setTime('')
                commit(null)
              }}
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <p className="reminder-hint">{task.status === 'canceled' ? 'Reopen this task to set a reminder.' : 'Give it a day to set a reminder.'}</p>
      )}
      <ChoiceModal
        open={pending !== null}
        title="Change the reminder for…"
        message="This is a recurring task. Change just this one, or the recurring rule and all its unfinished tasks?"
        choices={[
          { value: 'one', label: 'Only this one' },
          { value: 'all', label: 'All', primary: true },
        ]}
        onChoose={(scope) => {
          if (pending) onChange(pending.value, scope)
          setPending(null)
        }}
        onCancel={() => {
          setTime(task.reminderTime ?? '')
          setPending(null)
        }}
      />
    </div>
  )
}
