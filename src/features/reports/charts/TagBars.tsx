import { useId } from 'react'
import { Bar } from '@nivo/bar'
import type { ReportTagMetric } from '../../../domain/reportTypes'
import './TagBars.css'

const statusLabels: Record<string, string> = { done: 'done', doing: 'in progress', todo: 'to do', value: 'rondels' }
const tagLabel = (tag: ReportTagMetric) => tag.id === '__untagged__' ? tag.name : `#${tag.name}`
const printGroupSize = 12

export function TagBars({ metrics, kind, printMode = false }: { metrics: ReportTagMetric[]; kind: 'completion' | 'rondels'; printMode?: boolean }) {
  const patternPrefix = useId().replaceAll(':', '')
  const activeCount = (tag: ReportTagMetric) => tag.done + tag.inProgress + tag.todo
  const rows = metrics.filter((tag) => kind === 'completion' ? activeCount(tag) > 0 : tag.rondels > 0)
    .sort((a, b) => kind === 'completion'
      ? b.done - a.done || b.inProgress - a.inProgress || activeCount(b) - activeCount(a) || a.name.localeCompare(b.name)
      : b.rondels - a.rondels || a.name.localeCompare(b.name))
  const maximum = Math.max(1, ...rows.map((row) => kind === 'completion' ? activeCount(row) : row.rondels))
  const step = Math.max(1, Math.ceil(maximum / 4))
  const ticks = [...new Set([...Array.from({ length: Math.floor(maximum / step) + 1 }, (_, index) => index * step), maximum])]
  const data = rows.map((row) => ({
    label: row.id, name: tagLabel(row), color: row.color,
    ...(kind === 'completion' ? { done: row.done, doing: row.inProgress, todo: row.todo } : { value: row.rondels }),
  }))
  if (!rows.length) return <p className="report-empty-small">{kind === 'completion' ? 'A little room for your next win.' : 'Nothing has rolled forward yet.'}</p>
  const nameFor = (id: string | number) => {
    const tag = rows.find((row) => row.id === String(id))
    return tag ? tagLabel(tag) : ''
  }
  const chunks = printMode ? Array.from({ length: Math.ceil(data.length / printGroupSize) }, (_, index) => data.slice(index * printGroupSize, (index + 1) * printGroupSize)) : [data]
  return (
    <div className="tag-bars">
      <div className="tag-bars-chart" role="region" aria-label={kind === 'completion' ? 'Task status by tag' : 'Rondels by tag'} tabIndex={0}>
        {chunks.map((chunk, index) => <div className="tag-bars-page" key={index}>
          <Bar width={540} height={Math.max(190, chunk.length * 34 + 30)} data={chunk} keys={kind === 'completion' ? ['done', 'doing', 'todo'] : ['value']} indexBy="label"
            layout="horizontal" margin={{ top: 6, right: 28, bottom: 28, left: 112 }} padding={0.5}
            colors={({ id, data: datum }) => id === 'todo' ? '#ffffff' : String(datum.color)}
            borderColor={({ data: bar }) => String(bar.data.color)} borderWidth={1.5}
            borderRadius={3} enableLabel={false}
            defs={[{ id: `${patternPrefix}-${index}-in-progress-lines`, type: 'patternLines', background: 'inherit', color: 'rgba(255,255,255,0.8)', rotation: 45, lineWidth: 2, spacing: 6 }]}
            fill={kind === 'completion' ? [{ match: { id: 'doing' }, id: `${patternPrefix}-${index}-in-progress-lines` }] : []}
            valueScale={{ type: 'linear', min: 0, max: maximum }}
            axisTop={null} axisRight={null}
            axisLeft={{ tickSize: 0, tickPadding: 10, format: (id) => {
              if (printMode) return String(data.findIndex((datum) => datum.label === String(id)) + 1)
              const name = nameFor(id)
              return name.length > 16 ? `${name.slice(0, 15)}…` : name
            } }}
            axisBottom={{ tickSize: 0, tickPadding: 8, tickValues: ticks }}
            enableGridY={false} enableGridX animate={false} isInteractive={!printMode} isFocusable={!printMode}
            barAriaLabel={(bar) => `${String(bar.data.name)}: ${bar.value} ${statusLabels[String(bar.id)]}`}
            tooltip={({ id, value, data: datum }) => <div className="tag-bars-tooltip"><strong>{String(datum.name)}</strong><span>{value} {statusLabels[String(id)]}</span></div>}
          />
          {printMode && <ol className="tag-bars-print-labels" start={index * printGroupSize + 1}>
            {chunk.map((datum) => <li key={datum.label}>{datum.name}</li>)}
          </ol>}
        </div>)}
      </div>
      {kind === 'completion' && <div className="tag-bars-key">
        <span><i />Done</span><span><i className="tag-bars-striped" />In progress</span>
        <span><i className="tag-bars-outline" />To do</span>
      </div>}
    </div>
  )
}
