import { addDays, addMonths, fromIso, startOfMonth, startOfWeek, toIso } from './dates'
import { describeRepeat, ordinal, repeatDatesBetween } from './repeat'
import type { RecurringRule, RepeatSpec, TaskBucket } from './types'

export interface Occurrence {
  /** The occurrence's anchor date (used for de-duplication / lastRun tracking). */
  date: string
  dayDate: string
  rondeled: boolean
  bucket: TaskBucket | null
}

function firstWeekdayOnOrAfter(iso: string, weekday: number): string {
  const d = fromIso(iso)
  const diff = (weekday - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  return toIso(d)
}

function clampDayOfMonth(monthStartIso: string, day: number): string {
  const d = fromIso(monthStartIso)
  const year = d.getFullYear()
  const month = d.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return toIso(new Date(year, month, Math.min(day, lastDay)))
}

const CAP = 120

/** All occurrences of `rule` with anchor date in [startIso, horizonIso]. */
export function occurrencesBetween(
  rule: RecurringRule,
  startIso: string,
  horizonIso: string,
  weekStartDay: number,
): Occurrence[] {
  const out: Occurrence[] = []
  if (startIso > horizonIso) return out

  if (rule.kind === 'weekly-on' && rule.weekday != null) {
    let d = firstWeekdayOnOrAfter(startIso, rule.weekday)
    while (d <= horizonIso && out.length < CAP) {
      out.push({ date: d, dayDate: d, rondeled: false, bucket: null })
      d = addDays(d, 7)
    }
  } else if (rule.kind === 'monthly-on' && rule.dayOfMonth != null) {
    let m = startOfMonth(startIso)
    while (m <= horizonIso && out.length < CAP) {
      const d = clampDayOfMonth(m, rule.dayOfMonth)
      if (d >= startIso && d <= horizonIso) out.push({ date: d, dayDate: d, rondeled: false, bucket: null })
      m = addMonths(m, 1)
    }
  } else if (rule.kind === 'weekly-start') {
    let w = startOfWeek(startIso, weekStartDay)
    if (w < startIso) w = addDays(w, 7)
    while (w <= horizonIso && out.length < CAP) {
      // Waits in the week's rondel container, anchored to its first day.
      out.push({ date: w, dayDate: w, rondeled: true, bucket: null })
      w = addDays(w, 7)
    }
  } else if (rule.kind === 'monthly-start') {
    let m = startOfMonth(startIso)
    if (m < startIso) m = addMonths(m, 1)
    while (m <= horizonIso && out.length < CAP) {
      // Waits in the month's rondel container, anchored to its first day.
      out.push({ date: m, dayDate: m, rondeled: true, bucket: null })
      m = addMonths(m, 1)
    }
  } else if (rule.kind === 'repeat' && rule.repeat) {
    for (const d of repeatDatesBetween(rule.repeat, startIso, horizonIso, weekStartDay, CAP)) {
      out.push({ date: d, dayDate: d, rondeled: false, bucket: null })
    }
  }

  return out
}

/**
 * A rule's pattern as a repeat, for editing. Rules made before custom repeat
 * ("every Monday", "every 15th") become the same pattern, starting when the
 * rule was made. Start-of-week/month rules have none.
 */
export function repeatOf(rule: RecurringRule): RepeatSpec | null {
  const startDate = toIso(new Date(rule.createdAt))
  if (rule.kind === 'repeat') return rule.repeat
  if (rule.kind === 'weekly-on') return { unit: 'week', every: 1, weekdays: [rule.weekday ?? 1], startDate, endDate: null }
  if (rule.kind === 'monthly-on') {
    return { unit: 'month', every: 1, monthly: { type: 'date', days: [rule.dayOfMonth ?? 1] }, startDate, endDate: null }
  }
  return null
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function describeRecurrence({
  kind,
  weekday,
  dayOfMonth,
  repeat,
}: Pick<RecurringRule, 'kind' | 'weekday' | 'dayOfMonth' | 'repeat'>): string {
  switch (kind) {
    case 'repeat':
      return repeat ? describeRepeat(repeat) : ''
    case 'weekly-start':
      return 'Start of every week, rondeled into that week'
    case 'monthly-start':
      return 'Start of every month, rondeled into that month'
    case 'weekly-on':
      return `Every ${WEEKDAY[weekday ?? 1]}`
    case 'monthly-on':
      return `Every ${ordinal(dayOfMonth ?? 1)} of the month`
    default:
      return ''
  }
}
