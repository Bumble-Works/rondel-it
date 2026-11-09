import { useState } from 'react'

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

export function useDashboardDisplay(today: string): DashboardDisplay {
  const [selection, setSelection] = useState<DashboardSelection>(() => ({
    collapsed: [], calendarYear: Number(today.slice(0, 4)), hiddenTimeline: [],
  }))
  return {
    ...selection,
    toggleSection: (id) => setSelection((current) => ({ ...current,
      collapsed: current.collapsed.includes(id) ? current.collapsed.filter((key) => key !== id) : [...current.collapsed, id],
    })),
    setCalendarYear: (year) => setSelection((current) => ({ ...current, calendarYear: year })),
    setHiddenTimeline: (hidden) => setSelection((current) => ({ ...current, hiddenTimeline: hidden })),
  }
}
