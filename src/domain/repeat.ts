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
      const monthly = spec.monthly ?? { type: 'date', day: start.day }
      if (monthly.type === 'date') return day.day === Math.min(monthly.day, lastDay)
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
      const monthly = spec.monthly ?? { type: 'date', day: start.day }
      const on = monthly.type === 'date' ? `the ${ordinal(monthly.day)}` : `the ${NTH[monthly.nth]} ${weekdayName(monthly.weekday)}`
      text = `${every('month', 'months')} on ${on}`
      break
    }
    case 'year':
      text = `${every('year', 'years')} on ${formatShort(spec.startDate)}`
      break
  }
  return spec.endDate ? `${text} until ${formatShort(spec.endDate)}` : text
}

export type RepeatPresetId =
  | 'daily'
  | 'weekdays'
  | 'weekends'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'every-3-months'
  | 'every-6-months'
  | 'yearly'

/** Apple Reminders' presets, as repeat patterns anchored on `startDate`. */
export const REPEAT_PRESETS: Array<{ id: RepeatPresetId; label: string; make: (startDate: string) => RepeatSpec }> = [
  { id: 'daily', label: 'Daily', make: (s) => ({ unit: 'day', every: 1, startDate: s, endDate: null }) },
  { id: 'weekdays', label: 'Weekdays', make: (s) => ({ unit: 'week', every: 1, weekdays: [1, 2, 3, 4, 5], startDate: s, endDate: null }) },
  { id: 'weekends', label: 'Weekends', make: (s) => ({ unit: 'week', every: 1, weekdays: [0, 6], startDate: s, endDate: null }) },
  { id: 'weekly', label: 'Weekly', make: (s) => ({ unit: 'week', every: 1, weekdays: [parts(s).weekday], startDate: s, endDate: null }) },
  { id: 'biweekly', label: 'Biweekly', make: (s) => ({ unit: 'week', every: 2, weekdays: [parts(s).weekday], startDate: s, endDate: null }) },
  ...([1, 3, 6] as const).map((every) => ({
    id: (every === 1 ? 'monthly' : `every-${every}-months`) as RepeatPresetId,
    label: every === 1 ? 'Monthly' : `Every ${every} months`,
    make: (s: string): RepeatSpec => ({ unit: 'month', every, monthly: { type: 'date', day: parts(s).day }, startDate: s, endDate: null }),
  })),
  { id: 'yearly', label: 'Yearly', make: (s) => ({ unit: 'year', every: 1, startDate: s, endDate: null }) },
]

/** Which preset `spec` is (ignoring its end date), or 'custom'. */
export function presetOf(spec: RepeatSpec): RepeatPresetId | 'custom' {
  const same = (a: RepeatSpec, b: RepeatSpec) => JSON.stringify({ ...a, endDate: null }) === JSON.stringify({ ...b, endDate: null })
  return REPEAT_PRESETS.find((p) => same(p.make(spec.startDate), spec))?.id ?? 'custom'
}

/** Where a new rule starts: weekly, on the start date's weekday. */
export function defaultRepeat(startDate: string): RepeatSpec {
  return REPEAT_PRESETS.find((p) => p.id === 'weekly')!.make(startDate)
}
