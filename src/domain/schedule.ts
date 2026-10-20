import { addDays, fromIso, toIso } from './dates'
import type { Task, UserSetting } from './types'

/**
 * Timed events, all in local time: task reminders, the two daily review
 * times, and midnight (when a new day's recurring tasks are created).
 */
export type ScheduledEvent =
  | { kind: 'reminder'; at: Date; key: string; task: Task }
  | { kind: 'review'; at: Date; key: string; slot: 'start' | 'end' }
  | { kind: 'midnight'; at: Date; key: string }

/** A local date ('YYYY-MM-DD') at a local time ('HH:mm'). */
export function atLocal(dayIso: string, time: string): Date {
  const date = fromIso(dayIso)
  const [h, m] = time.split(':').map(Number)
  date.setHours(h, m, 0, 0)
  return date
}

/** Reminders for `tasks`, plus today's and tomorrow's review times and the next midnight, oldest first. */
export function scheduledEvents(
  now: Date,
  tasks: Task[],
  settings: Pick<UserSetting, 'dayStartTime' | 'endOfDayTime'>,
): ScheduledEvent[] {
  const today = toIso(now)
  const tomorrow = addDays(today, 1)
  const events: ScheduledEvent[] = []

  for (const task of tasks) {
    if (!task.reminderTime || !task.dayDate) continue
    events.push({
      kind: 'reminder',
      at: atLocal(task.dayDate, task.reminderTime),
      // The time is in the key, so changing it re-arms the reminder.
      key: `reminder:${task.id}:${task.dayDate}:${task.reminderTime}`,
      task,
    })
  }
  for (const day of [today, tomorrow]) {
    events.push({ kind: 'review', slot: 'start', at: atLocal(day, settings.dayStartTime), key: `review:${day}:start` })
    events.push({ kind: 'review', slot: 'end', at: atLocal(day, settings.endOfDayTime), key: `review:${day}:end` })
  }
  // Today's midnight too: when the timer wakes just after midnight, "now" is
  // already the new day, and this is the event that's due.
  for (const day of [today, tomorrow]) events.push({ kind: 'midnight', at: atLocal(day, '00:00'), key: `midnight:${day}` })

  return events.sort((a, b) => a.at.getTime() - b.at.getTime())
}

/**
 * What to fire now, and when to look again. Reminders missed earlier today
 * (app closed or asleep) still fire; review times already past when the app
 * opened don't (the nag shown on open covers them), which the caller handles
 * by marking those as fired.
 */
export function planEvents(
  events: ScheduledEvent[],
  now: Date,
  fired: ReadonlySet<string>,
): { due: ScheduledEvent[]; next: ScheduledEvent | null } {
  const today = toIso(now)
  const pending = events.filter((e) => !fired.has(e.key))
  const due = pending.filter((e) => e.at <= now && toIso(e.at) === today)
  const next = pending.find((e) => e.at > now) ?? null
  return { due, next }
}

/**
 * The reminder time ('HH:mm') a snooze moves to: `minutes` from now, but never
 * past 23:59, since a reminder belongs to its day.
 */
export function snoozedTime(now: Date, minutes = 10): string {
  const later = new Date(now.getTime() + minutes * 60_000)
  if (toIso(later) !== toIso(now)) return '23:59'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(later.getHours())}:${pad(later.getMinutes())}`
}
