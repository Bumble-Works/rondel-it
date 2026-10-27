import { addDays, addMonths, fromIso, startOfMonth, startOfWeek, toIso } from '../../domain/dates'
import { validateReportRange } from '../../domain/reportDates'
import type { ReportRange } from '../../domain/reportTypes'

export const reportPresets = [
  { value: 'past-14-days', label: 'Past 14 days' },
  { value: 'this-week', label: 'This week' },
  { value: 'last-week', label: 'Last week' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-quarter', label: 'This quarter' },
  { value: 'last-quarter', label: 'Last quarter' },
  { value: 'this-year', label: 'This year' },
  { value: 'last-year', label: 'Last year' },
  { value: 'custom', label: 'Custom' },
] as const

export type ReportPreset = typeof reportPresets[number]['value']

export function getReportRange(
  preset: ReportPreset,
  today: string,
  weekStartDay: number,
  custom?: ReportRange,
): ReportRange {
  if (preset === 'custom') {
    if (!custom) throw new Error('Choose a start and end date for the custom report.')
    return validateReportRange(custom)
  }
  if (preset === 'past-14-days') return { start: addDays(today, -13), end: today }
  const date = fromIso(today)
  const starts = {
    week: startOfWeek(today, weekStartDay),
    month: startOfMonth(today),
    quarter: toIso(new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)),
    year: `${date.getFullYear()}-01-01`,
  }
  const unit = preset.split('-')[1] as keyof typeof starts
  const start = starts[unit]
  if (preset.startsWith('this-')) return { start, end: today }
  const previous = unit === 'week' ? addDays(start, -7) : addMonths(start, { month: -1, quarter: -3, year: -12 }[unit])
  return { start: previous, end: addDays(start, -1) }
}
