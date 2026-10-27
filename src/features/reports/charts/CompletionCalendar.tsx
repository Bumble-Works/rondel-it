import { Calendar } from '@nivo/calendar'
import type { Dashboard } from '../../../domain/reportTypes'
import './CompletionCalendar.css'

interface CompletionCalendarProps {
  dashboard: Dashboard
  year: number
  onYearChange: (year: number) => void
}

export function CompletionCalendar({ dashboard, year, onYearChange }: CompletionCalendarProps) {
  const first = Number(dashboard.range.start.slice(0, 4))
  const last = Number(dashboard.range.end.slice(0, 4))
  const years = Array.from({ length: last - first + 1 }, (_, index) => first + index)
  const data = dashboard.completions.filter((entry) => entry.day.startsWith(`${year}-`))
  const completed = data.reduce((sum, entry) => sum + entry.value, 0)
  return (
    <div className="completion-calendar">
      <div className="completion-calendar-head">
        <p><strong>{completed}</strong> completed on <strong>{data.filter((entry) => entry.value > 0).length}</strong> days in {year}</p>
        {years.length > 1 && <label>Year <select value={year} onChange={(event) => onYearChange(Number(event.target.value))}>
          {years.map((value) => <option key={value} value={value}>{value}</option>)}
        </select></label>}
      </div>
      <div className="completion-calendar-scroll" role="img" aria-label={`${completed} tasks completed in ${year} within the selected period`}>
        <Calendar width={900} height={175} data={data} from={`${year}-01-01`} to={`${year}-12-31`}
          margin={{ top: 30, right: 20, bottom: 12, left: 20 }} yearLegendPosition="after" yearLegendOffset={10}
          emptyColor="#eef2f7" colors={['#c6efdf', '#89dcbd', '#41c599', '#16a777']}
          dayBorderWidth={2} dayBorderColor="#fff" monthBorderWidth={0} monthLegendOffset={10}
          isInteractive={false}
        />
      </div>
      <div className="completion-calendar-key"><span>Fewer</span><i /><i /><i /><i /><span>More</span></div>
      <p className="report-caption">Completed dates in your selected period. Empty days include dates outside the period.</p>
    </div>
  )
}
