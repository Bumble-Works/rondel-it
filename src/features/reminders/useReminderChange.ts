import { useState } from 'react'
import type { Task } from '../../domain/types'
import { ensureNotificationPermission } from '../../shared/notify'
import type { ReminderScope } from './ReminderField'

/** Keep the recurring choice outside a popover so closing it cannot lose the choice. */
export function useReminderChange(task: Task, onChange: (value: string | null, scope: ReminderScope) => void) {
  const [pending, setPending] = useState<{ value: string | null } | null>(null)
  const commit = (value: string | null) => {
    if (value === task.reminderTime) return
    if (value) void ensureNotificationPermission()
    if (task.recurringRuleId) setPending({ value })
    else onChange(value, 'one')
  }
  return {
    commit,
    choice: {
      open: pending !== null,
      title: 'Change the reminder for…',
      message: 'This is a recurring task. Change just this one, or the recurring rule and all its unfinished tasks?',
      choices: [
        { value: 'one' as const, label: 'Only this one' },
        { value: 'all' as const, label: 'All', primary: true },
      ],
      onChoose: (scope: ReminderScope) => {
        if (pending) onChange(pending.value, scope)
        setPending(null)
      },
      onCancel: () => setPending(null),
    },
  }
}
