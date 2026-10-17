import { addDays, addMonths, fromIso, startOfMonth, startOfWeek, toIso } from './dates'
import type { RecurrenceKind, RecurringRule, TaskBucket } from './types'

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
      // Parked in the week's rondel container, anchored to its first day.
      out.push({ date: w, dayDate: w, rondeled: true, bucket: null })
      w = addDays(w, 7)
    }
  } else if (rule.kind === 'monthly-start') {
    let m = startOfMonth(startIso)
    if (m < startIso) m = addMonths(m, 1)
    while (m <= horizonIso && out.length < CAP) {
      // Parked in the month's rondel container, anchored to its first day.
      out.push({ date: m, dayDate: m, rondeled: true, bucket: null })
      m = addMonths(m, 1)
    }
  }

  return out
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function describeRecurrence(kind: RecurrenceKind, weekday: number | null, dayOfMonth: number | null): string {
  switch (kind) {
    case 'weekly-start':
      return 'Every week → Next Week bucket'
    case 'monthly-start':
      return 'Every month → Next Month bucket'
    case 'weekly-on':
      return `Every ${WEEKDAY[weekday ?? 1]}`
    case 'monthly-on':
      return `Every ${ordinal(dayOfMonth ?? 1)} of the month`
    default:
      return ''
  }
}
