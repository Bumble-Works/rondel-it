import { useState } from 'react'
import type { ReportRange } from '../../domain/reportTypes'

interface DashboardSelection {
  collapsed: string[]
  calendarYear: number
  hiddenTimeline: string[]
}

export interface DashboardDisplay extends DashboardSelection {
  toggleSection: (id: string) => void
  setCalendarYear: (year: number) => void
  setHiddenTimeline: (hidden: string[]) => void
}

export function useDashboardDisplay(range: ReportRange | null, today: string): DashboardDisplay {
  const [selection, setSelection] = useState<DashboardSelection>(() => ({
    collapsed: [], calendarYear: Number(today.slice(0, 4)), hiddenTimeline: [],
  }))
  const calendarYear = range ? Math.max(Number(range.start.slice(0, 4)),
    Math.min(selection.calendarYear, Number(range.end.slice(0, 4)))) : selection.calendarYear
  return {
    ...selection, calendarYear,
    toggleSection: (id) => setSelection((current) => ({ ...current,
      collapsed: current.collapsed.includes(id) ? current.collapsed.filter((key) => key !== id) : [...current.collapsed, id],
    })),
    setCalendarYear: (year) => setSelection((current) => ({ ...current, calendarYear: year })),
    setHiddenTimeline: (hidden) => setSelection((current) => ({ ...current, hiddenTimeline: hidden })),
  }
}
