import { useEffect, useState } from 'react'
import { ReminderList } from './ReminderList'
import { listenForReminders, sendReminderAction, type ReminderList as List } from './reminderWindow'
import './ReminderPopup.css'

/** The whole page of the Mac app's always-on-top reminder window. */
export function ReminderPopup() {
  const [list, setList] = useState<List>({ tasks: [], weekStartDay: 1 })
  useEffect(() => listenForReminders(setList), [])

  return (
    <main className="reminder-popup">
      <ReminderList
        tasks={list.tasks}
        weekStartDay={list.weekStartDay}
        onAct={(task, action) => sendReminderAction(task.id, action)}
      />
    </main>
  )
}
