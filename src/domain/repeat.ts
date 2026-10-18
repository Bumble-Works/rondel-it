import { addDays, formatShort, fromIso, startOfWeek, weekdayName } from './dates'
import type { RepeatSpec } from './types'

/** Whole days between two local dates (DST-safe). */
function daysBetween(a: string, b: string): number {
  const utc = (iso: string) => {
    const d = fromIso(iso)
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  }
  return Math.round((utc(b) - utc(a)) / 86_400_000)
}

const parts = (iso: string) => {
  const d = fromIso(iso)
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), weekday: d.getDay() }
}
const lastDayOf = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Does `spec` repeat on `iso`? */
export function repeatsOn(spec: RepeatSpec, iso: string, weekStartDay: number): boolean {
  if (iso < spec.startDate || (spec.endDate && iso > spec.endDate)) return false
  const start = parts(spec.startDate)
  const day = parts(iso)
  const every = Math.max(1, spec.every)

  switch (spec.unit) {
    case 'day':
      return daysBetween(spec.startDate, iso) % every === 0
    case 'week': {
      const weekdays = spec.weekdays?.length ? spec.weekdays : [start.weekday]
      const weeks = daysBetween(startOfWeek(spec.startDate, weekStartDay), startOfWeek(iso, weekStartDay)) / 7
      return weekdays.includes(day.weekday) && weeks % every === 0
    }
    case 'month': {
      const months = (day.year - start.year) * 12 + (day.month - start.month)
      if (months % every !== 0) return false
      const lastDay = lastDayOf(day.year, day.month)
      const monthly = spec.monthly ?? { type: 'date', days: [start.day] }
      if (monthly.type === 'date') return monthly.days.some((d) => day.day === Math.min(d, lastDay))
      if (day.weekday !== monthly.weekday) return false
      return monthly.nth === -1 ? day.day + 7 > lastDay : Math.ceil(day.day / 7) === monthly.nth
    }
    case 'year':
      return (
        (day.year - start.year) % every === 0 &&
        day.month === start.month &&
        // Feb 29 falls on Feb 28 in other years.
        day.day === Math.min(start.day, lastDayOf(day.year, day.month))
      )
  }
}

/** Dates in [from, to] that `spec` repeats on, oldest first (at most `cap`). */
export function repeatDatesBetween(spec: RepeatSpec, from: string, to: string, weekStartDay: number, cap = 120): string[] {
  const out: string[] = []
  let iso = from < spec.startDate ? spec.startDate : from
  const last = spec.endDate && spec.endDate < to ? spec.endDate : to
  // Bounded walk: ~10 years of days at most.
  for (let i = 0; iso <= last && out.length < cap && i < 3700; i++, iso = addDays(iso, 1)) {
    if (repeatsOn(spec, iso, weekStartDay)) out.push(iso)
  }
  return out
}

const short = (weekday: number) => weekdayName(weekday).slice(0, 3)
const NTH: Record<number, string> = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', [-1]: 'last' }

/** e.g. "Every weekday", "Every 2 weeks on Mon, Thu", "Every month on the first Monday until Dec 31". */
export function describeRepeat(spec: RepeatSpec): string {
  const n = Math.max(1, spec.every)
  const every = (one: string, many: string) => (n === 1 ? `Every ${one}` : `Every ${n} ${many}`)
  const start = parts(spec.startDate)
  let text: string
  switch (spec.unit) {
    case 'day':
      text = every('day', 'days')
      break
    case 'week': {
      const days = [...(spec.weekdays?.length ? spec.weekdays : [start.weekday])].sort()
      const key = days.join(',')
      if (n === 1 && key === '1,2,3,4,5') text = 'Every weekday'
      else if (n === 1 && key === '0,6') text = 'Every weekend'
      else text = `${every('week', 'weeks')} on ${days.map(short).join(', ')}`
      break
    }
    case 'month': {
      const monthly = spec.monthly ?? { type: 'date', days: [start.day] }
      const on =
        monthly.type === 'date'
          ? `the ${[...monthly.days].sort((a, b) => a - b).map(ordinal).join(', ')}`
          : `the ${NTH[monthly.nth]} ${weekdayName(monthly.weekday)}`
      text = `${every('month', 'months')} on ${on}`
      break
    }
    case 'year':
      text = `${every('year', 'years')} on ${formatShort(spec.startDate)}`
      break
  }
  return spec.endDate ? `${text} until ${formatShort(spec.endDate)}` : text
}

export type RepeatPresetId = 'daily' | 'monthly' | 'yearly'

/** The quick choices, as repeat patterns anchored on `startDate`. Anything else is Custom. */
export const REPEAT_PRESETS: Array<{ id: RepeatPresetId; label: string; make: (startDate: string) => RepeatSpec }> = [
  { id: 'daily', label: 'Daily', make: (s) => ({ unit: 'day', every: 1, startDate: s, endDate: null }) },
  {
    id: 'monthly',
    label: 'Monthly',
    make: (s) => ({ unit: 'month', every: 1, monthly: { type: 'date', days: [parts(s).day] }, startDate: s, endDate: null }),
  },
  { id: 'yearly', label: 'Yearly', make: (s) => ({ unit: 'year', every: 1, startDate: s, endDate: null }) },
]

/** Where a new rule starts: daily, from the start date. */
export function defaultRepeat(startDate: string): RepeatSpec {
  return REPEAT_PRESETS[0].make(startDate)
}
