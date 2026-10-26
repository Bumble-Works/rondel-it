import { atLocal, handledBeforeOpen, planEvents, scheduledEvents, snoozedTime } from './schedule'
import type { Task } from './types'

const settings = { dayStartTime: '09:00', endOfDayTime: '17:00' }
const task = (fields: Partial<Task>) => ({ id: 't', dayDate: '2026-10-19', reminderTime: '10:30', ...fields }) as Task

describe('schedule', () => {
  const now = new Date(2026, 9, 19, 9, 30) // Mon Oct 19, 09:30 local

  it('lists reminders, both review times for today and tomorrow, and midnight, in order', () => {
    const events = scheduledEvents(now, [task({})], settings)
    expect(events.map((e) => e.key)).toEqual([
      'midnight:2026-10-19',
      'review:2026-10-19:start',
      'reminder:t:2026-10-19:10:30',
      'review:2026-10-19:end',
      'midnight:2026-10-20',
      'review:2026-10-20:start',
      'review:2026-10-20:end',
    ])
    expect(events[2].at).toEqual(atLocal('2026-10-19', '10:30'))
  })

  it('fires what is due today (including a reminder missed while closed) and finds the next one', () => {
    const events = scheduledEvents(now, [task({ reminderTime: '08:00' }), task({ id: 'later', reminderTime: '11:00' })], settings)
    const fired = new Set(['midnight:2026-10-19', 'review:2026-10-19:start'])
    const { due, next } = planEvents(events, now, fired)
    expect(due.map((e) => e.key)).toEqual(['reminder:t:2026-10-19:08:00'])
    expect(next?.key).toBe('reminder:later:2026-10-19:11:00')
  })

  it('never fires something twice, or a reminder from a past day', () => {
    const events = scheduledEvents(now, [task({ dayDate: '2026-10-18', reminderTime: '08:00' })], settings)
    const { due } = planEvents(events, now, new Set(['midnight:2026-10-19', 'review:2026-10-19:start']))
    expect(due).toEqual([])
  })

  it('re-arms a reminder when its time changes', () => {
    const before = scheduledEvents(now, [task({ reminderTime: '10:30' })], settings).find((e) => e.kind === 'reminder')
    const after = scheduledEvents(now, [task({ reminderTime: '10:45' })], settings).find((e) => e.kind === 'reminder')
    expect(before?.key).not.toBe(after?.key)
  })

  it('fires the new day just after midnight', () => {
    const justAfter = new Date(2026, 9, 20, 0, 0, 1)
    const { due } = planEvents(scheduledEvents(justAfter, [], settings), justAfter, new Set())
    expect(due.map((e) => e.key)).toEqual(['midnight:2026-10-20'])
  })

  it('suppresses end-of-day and midnight on open, but lets the morning review catch up', () => {
    // Opened at 18:00, past both the 09:00 morning and 17:00 end-of-day reviews.
    const opened = new Date(2026, 9, 19, 18, 0)
    const handled = handledBeforeOpen(opened, settings)
    expect(handled).toContain('review:2026-10-19:end')
    expect(handled).toContain('midnight:2026-10-19')
    // The morning review is left to catch up (fire) on open.
    expect(handled).not.toContain('review:2026-10-19:start')
  })

  it('suppresses only the past midnight when the app opens before any review time', () => {
    const opened = new Date(2026, 9, 19, 7, 0) // before 09:00
    expect(handledBeforeOpen(opened, settings)).toEqual(['midnight:2026-10-19'])
  })

  it('snoozes a reminder 10 minutes from now, kept on its day', () => {
    expect(snoozedTime(new Date(2026, 9, 19, 12, 30, 40))).toBe('12:40')
    expect(snoozedTime(new Date(2026, 9, 19, 9, 55))).toBe('10:05')
    expect(snoozedTime(new Date(2026, 9, 19, 23, 55))).toBe('23:59')
  })
})
