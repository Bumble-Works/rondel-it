import { useState } from 'react'
import { addDays, firstDayOfNextMonth, firstDayOfNextWeek, todayIso } from '../../domain/dates'
import { atLocal } from '../../domain/schedule'
import type { Task } from '../../domain/types'
import { DatePickModal } from '../rondel/DatePickModal'
import { Icon } from '../../shared/ui/Icon'
import { PillButton } from '../../shared/ui/PillButton'
import { TaskActionItem, TaskActionList } from '../../shared/ui/TaskActionItem'
import type { ReminderAction } from './reminderWindow'
import './ReminderList.css'

interface ReminderListProps {
  tasks: Task[]
  weekStartDay: number
  onAct: (task: Task, action: ReminderAction) => void
}

function reminderLabel(task: Task): string | null {
  if (!task.dayDate || !task.reminderTime) return null
  const time = atLocal(task.dayDate, task.reminderTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `Reminder · ${time}`
}

/** Reminders that went off: snooze, mark done, or reschedule each one. */
export function ReminderList({ tasks, weekStartDay, onAct }: ReminderListProps) {
  const [pickingFor, setPickingFor] = useState<Task | null>(null)
  const today = todayIso()
  const reschedule = (task: Task, toDate: string, rondeled = false) =>
    onAct(task, { kind: 'reschedule', target: { toDate, rondeled } })

  return (
    <>
      <TaskActionList>
        {tasks.map((task) => (
          <TaskActionItem key={task.id} task={task} detail={reminderLabel(task)}>
            <div className="reminder-list-group">
              <PillButton onClick={() => onAct(task, { kind: 'snooze' })}>Snooze 10 min</PillButton>
            <PillButton tone="done" onClick={() => onAct(task, { kind: 'done' })}>
              <Icon name="check" size={15} />
              Done
              </PillButton>
            </div>
            <div className="reminder-list-group">
              <span className="reminder-list-label">Reschedule</span>
            <PillButton onClick={() => reschedule(task, addDays(today, 1))}>Tomorrow</PillButton>
            <PillButton onClick={() => reschedule(task, firstDayOfNextWeek(today, weekStartDay), true)}>
              Next week
            </PillButton>
            <PillButton onClick={() => reschedule(task, firstDayOfNextMonth(today), true)}>Next month</PillButton>
            <PillButton aria-label="Pick a date" title="Pick a date" onClick={() => setPickingFor(task)}>
              <Icon name="calendar" size={15} />
              </PillButton>
            </div>
          </TaskActionItem>
        ))}
      </TaskActionList>
      {pickingFor && (
        <DatePickModal
          open
          onClose={() => setPickingFor(null)}
          onConfirm={(dateIso) => {
            setPickingFor(null)
            reschedule(pickingFor, dateIso)
          }}
        />
      )}
    </>
  )
}
