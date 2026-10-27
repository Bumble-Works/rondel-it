import { Bar } from '@nivo/bar'
import type { ReportTagMetric } from '../../../domain/reportTypes'
import './TagBars.css'

export function TagBars({ metrics, kind }: { metrics: ReportTagMetric[]; kind: 'completion' | 'rondels' }) {
  const sorted = [...metrics].sort((a, b) => kind === 'completion'
    ? (b.completionRate ?? -1) - (a.completionRate ?? -1) || b.done - a.done
    : b.rondels - a.rondels)
  const rows = sorted.slice(0, 8)
  const data = rows.map((row, index) => ({
    label: String(index), value: kind === 'completion' ? row.completionRate ?? 0 : row.rondels, color: row.color,
  }))
  if (!rows.length) return <p className="report-empty-small">Tag your tasks to see where your work goes.</p>
  return (
    <div className="tag-bars">
      <div className="tag-bars-chart" aria-hidden="true">
        <Bar width={540} height={Math.max(100, rows.length * 39 + 25)} data={data} keys={['value']} indexBy="label"
          layout="horizontal" margin={{ top: 2, right: 5, bottom: 22, left: 0 }} padding={0.55}
          colors={({ data: datum }) => String(datum.color)} borderRadius={4} enableLabel={false}
          valueScale={{ type: 'linear', min: 0, max: kind === 'completion' ? 100 : 'auto' }}
          axisTop={null} axisRight={null} axisLeft={null}
          axisBottom={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (value) => kind === 'completion' ? `${value}%` : String(value) }}
          enableGridY={false} enableGridX animate={false} isInteractive={false}
        />
      </div>
      <ol className="tag-bars-labels">
        {rows.map((row) => <li key={row.id}>
          <span className="tag-bars-name" title={row.name}><i style={{ background: row.color }} />{row.name}</span>
          <strong>{kind === 'completion' ? `${row.done}/${row.total} · ${Math.round(row.completionRate ?? 0)}%` : `${row.rondels} rondels`}</strong>
        </li>)}
      </ol>
      <p className="report-caption">{metrics.length > 8 && 'Top 8 shown. '}A task with several tags counts under each.
        {kind === 'rondels' && ' Rondel totals cover each included task’s lifetime.'}</p>
    </div>
  )
}
