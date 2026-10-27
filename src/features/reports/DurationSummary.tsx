import type { ReportDuration } from '../../domain/reportTypes'
import { reportDays } from './reportPresentation'
import { CountBars } from './charts/CountBars'
import './DurationSummary.css'

export function DurationSummary({ duration, label }: { duration: ReportDuration; label: string }) {
  const buckets = [
    { label: 'Same day', from: 0, to: 0 }, { label: '1–2 days', from: 1, to: 2 },
    { label: '3–7 days', from: 3, to: 7 }, { label: '8–30 days', from: 8, to: 30 },
    { label: '31+ days', from: 31, to: Infinity },
  ].map(({ label, from, to }) => ({ label, count: duration.values.filter((value) => value >= from && value <= to).length }))
  return (
    <div className="duration-summary">
      <h3>{label}</h3>
      <div className="duration-summary-values">
        <p><strong>{reportDays(duration.average)}</strong><span>average</span></p>
        <p><strong>{reportDays(duration.median)}</strong><span>median</span></p>
      </div>
      {duration.available > 0 && <CountBars data={buckets} label={`${label}: completed tasks by days`} color="#8b7ae6" />}
      <p className="report-caption">Known for {duration.available} of {duration.total} completions. Calendar days, including waiting time.</p>
    </div>
  )
}
