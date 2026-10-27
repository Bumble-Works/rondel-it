import { addDays, addMonths, endOfMonth, startOfMonth, startOfWeek } from '../../domain/dates'
import { validateReportRange } from '../../domain/reportDates'
import type { ReportRange } from '../../domain/reportTypes'

export const reportPresets = [
  { value: 'this-week', label: 'This week' },
  { value: 'last-week', label: 'Last week' },
  { value: 'next-week', label: 'Next week' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
] as const

export type ReportPreset = typeof reportPresets[number]['value']

export function getReportRange(preset: ReportPreset, today: string, custom?: ReportRange): ReportRange {
  if (preset === 'custom') {
    if (!custom) throw new Error('Choose a start and end date for the custom report.')
    return validateReportRange(custom)
  }
  if (preset === 'this-month') return { start: startOfMonth(today), end: endOfMonth(today) }
  if (preset === 'last-month') {
    const start = addMonths(startOfMonth(today), -1)
    return { start, end: endOfMonth(start) }
  }
  const offset = preset === 'last-week' ? -7 : preset === 'next-week' ? 7 : 0
  const start = addDays(startOfWeek(today, 0), offset)
  return { start, end: addDays(start, 6) }
}
