import { useEffect, useRef } from 'react'
import { toIso } from '../../domain/dates'
import { planEvents, scheduledEvents, type ScheduledEvent } from '../../domain/schedule'
import type { Task, UserSetting } from '../../domain/types'

const FIRED_KEY = 'rondel.schedule.fired'
// Look again at least hourly, so sleep or a clock change can't strand a timer.
const MAX_WAIT_MS = 60 * 60 * 1000

function loadFired(today: string): Set<string> {
  try {
    const keys = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '[]') as string[]
    // Keep only today's and later entries.
    return new Set(keys.filter((k) => (k.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '') >= today))
  } catch {
    return new Set()
  }
}

function saveFired(fired: Set<string>) {
  localStorage.setItem(FIRED_KEY, JSON.stringify([...fired]))
}

interface Options {
  /** Active tasks with a reminder, today or later. */
  reminders: Task[]
  settings: UserSetting | null
  /** A task's reminder time arrived. */
  onReminder: (task: Task) => void
  /** A review time arrived. */
  onReview: (slot: 'start' | 'end') => void
  /** A new day started. */
  onNewDay: () => void
}

/**
 * Fires task reminders, review times and midnight on time,
 * even while the window is hidden: one timer, set for the next event.
 */
export function useSchedule({ reminders, settings, onReminder, onReview, onNewDay }: Options) {
  const handlers = useRef({ onReminder, onReview, onNewDay })
  // What has fired. Set up once per app open, then kept across re-plans.
  const firedRef = useRef<Set<string> | null>(null)
  useEffect(() => {
    handlers.current = { onReminder, onReview, onNewDay }
  })

  useEffect(() => {
    if (!settings) return
    if (!firedRef.current) {
      const opened = new Date()
      firedRef.current = loadFired(toIso(opened))
      // Catch up only the slot that already passed today at open:
      // morning review can catch up; end-of-day still waits for its time.
      for (const e of scheduledEvents(opened, [], settings)) {
        if (e.kind !== 'review') {
          if (e.at <= opened) firedRef.current.add(e.key)
          continue
        }
        if (e.slot === 'end' && e.at <= opened) firedRef.current.add(e.key)
      }
    }
    const fired = firedRef.current

    const fire = (event: ScheduledEvent) => {
      if (event.kind === 'reminder') handlers.current.onReminder(event.task)
      else if (event.kind === 'review') handlers.current.onReview(event.slot)
      else handlers.current.onNewDay()
    }

    let timer: number | undefined
    const plan = () => {
      window.clearTimeout(timer)
      const now = new Date()
      const { due, next } = planEvents(scheduledEvents(now, reminders, settings), now, fired)
      for (const event of due) {
        fired.add(event.key)
        fire(event)
      }
      saveFired(fired)
      if (next) timer = window.setTimeout(plan, Math.min(next.at.getTime() - now.getTime(), MAX_WAIT_MS))
    }

    plan()
    // Timers can run late after sleep; coming back to the app re-checks.
    window.addEventListener('focus', plan)
    document.addEventListener('visibilitychange', plan)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', plan)
      document.removeEventListener('visibilitychange', plan)
    }
  }, [reminders, settings])
}
