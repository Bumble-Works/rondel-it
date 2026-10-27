import { fromIso, toIso } from './dates'
import type { ReportRange } from './reportTypes'

export function isReportDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toIso(fromIso(value)) === value
}

export function recordedDate(value: string | null | undefined): string | null {
  if (!value) return null
  if (isReportDate(value)) return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : toIso(date)
}

export function inReportRange(date: string | null, range: ReportRange): boolean {
  return date !== null && date >= range.start && date <= range.end
}

export function calendarDays(start: string | null, end: string | null): number | null {
  if (!start || !end || !isReportDate(start) || !isReportDate(end)) return null
  const ordinal = (value: string) => {
    const date = fromIso(value)
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  }
  const days = (ordinal(end) - ordinal(start)) / 86_400_000
  return days >= 0 ? days : null
}

export function validateReportRange(range: ReportRange): ReportRange {
  if (!isReportDate(range.start) || !isReportDate(range.end) || range.start > range.end) {
    throw new Error('Choose valid report dates, with the start on or before the end.')
  }
  const start = fromIso(range.start)
  // Both endpoints are included, so the anniversary itself would add an extra day.
  const anniversary = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate())
  if (fromIso(range.end) >= anniversary) {
    throw new Error('Choose a report period of no more than one year.')
  }
  return range
}
