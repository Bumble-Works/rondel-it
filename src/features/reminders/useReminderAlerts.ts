import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Task } from '../../domain/types'
import { snoozedTime } from '../../domain/schedule'
import type { RondelTarget } from '../../services/adapters/DataSource'
import { isDesktopApp } from '../../services/sync/folder'
import { useAppBadge } from '../../shared/appBadge'
import { notify } from '../../shared/notify'
import {
  hideReminderPopup,
  listenToReminderPopup,
  sendReminders,
  showReminderPopup,
  type ReminderAction,
} from './reminderWindow'

interface Options {
  /** Active tasks with a reminder, as last loaded: keeps the alerts current. */
  reminderTasks: Task[]
  weekStartDay: number
  onSnooze: (task: Task, reminderTime: string) => void
  onSetDone: (task: Task) => void
  onRondel: (task: Task, target: RondelTarget) => void
}

/**
 * Reminders that went off and are waiting for a choice: snooze, done or
 * reschedule. The Mac app shows them in the always-on-top pop-up; the browser,
 * in a dialog (see ReminderModal).
 */
export function useReminderAlerts({ reminderTasks, weekStartDay, onSnooze, onSetDone, onRondel }: Options) {
  const [firedIds, setFiredIds] = useState<string[]>([])
  // Fresh copies; a task finished or deleted elsewhere drops out.
  const alerts = useMemo(() => {
    const byId = new Map(reminderTasks.map((t) => [t.id, t]))
    return firedIds.flatMap((id) => byId.get(id) ?? [])
  }, [firedIds, reminderTasks])

  // Mac app: a new reminder brings the pop-up forward; `popUpShown` hides it once all are handled.
  const popUpPending = useRef(false)
  const popUpShown = useRef(false)

  const add = useCallback((task: Task) => {
    setFiredIds((ids) => (ids.includes(task.id) ? ids : [...ids, task.id]))
    void notify('Rondel It reminder', task.title)
    popUpPending.current = true
  }, [])

  const act = (task: Task, action: ReminderAction) => {
    setFiredIds((ids) => ids.filter((id) => id !== task.id))
    if (action.kind === 'snooze') onSnooze(task, snoozedTime(new Date()))
    else if (action.kind === 'done') onSetDone(task)
    else onRondel(task, action.target)
  }
  const dismiss = useCallback(() => setFiredIds([]), [])
  useAppBadge('reminders', alerts.length > 0)

  // The pop-up's choices arrive as events; answer with the latest list and actions.
  const latest = useRef({ alerts, weekStartDay, act })
  useEffect(() => {
    latest.current = { alerts, weekStartDay, act }
  })
  useEffect(() => {
    if (!isDesktopApp()) return
    return listenToReminderPopup({
      onReady: () => sendReminders({ tasks: latest.current.alerts, weekStartDay: latest.current.weekStartDay }),
      onAct: (taskId, action) => {
        const task = latest.current.alerts.find((t) => t.id === taskId)
        if (task) latest.current.act(task, action)
        else console.error('[rondel] Reminder pop-up: that task is no longer waiting', taskId)
      },
      onDismiss: dismiss,
    })
  }, [dismiss])

  // Mirror the list into the pop-up. It comes forward only for a new reminder,
  // not every time the board reloads.
  useEffect(() => {
    if (!isDesktopApp()) return
    sendReminders({ tasks: alerts, weekStartDay })
    if (alerts.length > 0 && popUpPending.current) {
      showReminderPopup()
      popUpShown.current = true
    } else if (alerts.length === 0 && popUpShown.current) {
      hideReminderPopup()
      popUpShown.current = false
    }
    popUpPending.current = false
  }, [alerts, weekStartDay])

  return {
    add,
    /** For the browser, which has no pop-up window. */
    modal: { open: !isDesktopApp() && alerts.length > 0, tasks: alerts, onAct: act, onClose: dismiss },
  }
}
