/** Date helpers. All ISO dates are 'YYYY-MM-DD' in local time. */

export function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function todayIso(): string {
  return toIso(new Date())
}

export function addDays(iso: string, days: number): string {
  const date = fromIso(iso)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

/** Start of the week containing `iso`, honoring weekStartDay (0=Sun..6=Sat). */
export function startOfWeek(iso: string, weekStartDay: number): string {
  const date = fromIso(iso)
  const diff = (date.getDay() - weekStartDay + 7) % 7
  date.setDate(date.getDate() - diff)
  return toIso(date)
}

export function weekDays(startIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startIso, i))
}

export function isToday(iso: string): boolean {
  return iso === todayIso()
}

export function isPast(iso: string): boolean {
  return iso < todayIso()
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function weekdayName(day: number): string {
  return WEEKDAY[((day % 7) + 7) % 7]
}

/** e.g. "Monday, September 7" */
export function formatDayLabel(iso: string): string {
  const date = fromIso(iso)
  return `${WEEKDAY[date.getDay()]}, ${MONTH[date.getMonth()]} ${date.getDate()}`
}

/** e.g. "Sep 7" */
export function formatShort(iso: string): string {
  const date = fromIso(iso)
  return `${MONTH[date.getMonth()].slice(0, 3)} ${date.getDate()}`
}

/** Relative label for a day header: Today / Tomorrow / Yesterday / weekday. */
export function relativeDayLabel(iso: string): string | null {
  const t = todayIso()
  if (iso === t) return 'Today'
  if (iso === addDays(t, 1)) return 'Tomorrow'
  if (iso === addDays(t, -1)) return 'Yesterday'
  return null
}

/** Day header title: "Today (Wednesday)", or just "Wednesday" for other days. */
export function dayTitle(iso: string): string {
  const weekday = weekdayName(fromIso(iso).getDay())
  const relative = relativeDayLabel(iso)
  return relative ? `${relative} (${weekday})` : weekday
}

export function addMonths(iso: string, months: number): string {
  const date = fromIso(iso)
  date.setMonth(date.getMonth() + months)
  return toIso(date)
}

export function startOfMonth(iso: string): string {
  const date = fromIso(iso)
  return toIso(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function endOfMonth(iso: string): string {
  const date = fromIso(iso)
  return toIso(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

/** First day of the week AFTER the week containing `iso`. */
export function firstDayOfNextWeek(iso: string, weekStartDay: number): string {
  return addDays(startOfWeek(iso, weekStartDay), 7)
}

/** First day of the month AFTER the month containing `iso`. */
export function firstDayOfNextMonth(iso: string): string {
  // Step from the 1st: addMonths from the 31st overflows (Jan 31 → Mar 3).
  return addMonths(startOfMonth(iso), 1)
}

/** Current date + time in a given IANA timezone. Falls back to local on error. */
export function nowInZone(timeZone: string): { date: string; time: string } {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    let hour = get('hour')
    if (hour === '24') hour = '00'
    return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` }
  } catch {
    const now = new Date()
    return { date: toIso(now), time: now.toTimeString().slice(0, 5) }
  }
}

/** e.g. "September 2026" */
export function formatMonthLabel(iso: string): string {
  const date = fromIso(iso)
  return `${MONTH[date.getMonth()]} ${date.getFullYear()}`
}

/** "09:30" → "9:30 AM" (in the user's locale). */
export function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
