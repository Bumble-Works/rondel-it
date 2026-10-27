import { addDays } from './dates'
import { calendarDays, recordedDate } from './reportDates'
import type { LineageEvidence } from './reportEvidence'
import type { ReportListEntry } from './reportListStatus'
import type { ReportRange, ReportTimelineDay } from './reportTypes'

export function reportTimeline(entries: ReportListEntry[], evidence: LineageEvidence[], range: ReportRange): ReportTimelineDay[] {
  const days = Array.from({ length: (calendarDays(range.start, range.end) ?? 0) + 1 }, (_, index) => ({
    date: addDays(range.start, index), todo: 0, doing: 0, done: 0, canceled: 0, rondeled: 0,
  }))
  const byDate = new Map(days.map((day) => [day.date, day]))
  for (const entry of entries) {
    const day = byDate.get(entry.date)
    if (day) day[entry.status]++
  }
  for (const item of evidence) {
    for (const event of item.events) {
      const day = byDate.get(recordedDate(event.occurredAt) ?? '')
      if (day) day.rondeled++
    }
  }
  return days
}
