import { useState } from 'react'
import { canRemind } from '../../domain/rondel'
import type { Task } from '../../domain/types'
import { useReminderChange } from './useReminderChange'
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
  const { commit, choice } = useReminderChange(task, onChange)

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
        {...choice}
        onCancel={() => {
          setTime(task.reminderTime ?? '')
          choice.onCancel()
        }}
      />
    </div>
  )
}
