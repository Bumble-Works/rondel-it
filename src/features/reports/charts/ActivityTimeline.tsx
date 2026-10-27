import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatShort } from '../../../domain/dates'
import type { ReportActivity, ReportTimelineDay } from '../../../domain/reportTypes'
import { reportDate } from '../reportPresentation'
import { reportColors } from '../reportColors'
import './ActivityTimeline.css'

const series: { key: keyof ReportActivity; label: string; color: string; dash?: string }[] = [
  { key: 'todo', label: 'To do', color: reportColors.todo, dash: '4 4' },
  { key: 'doing', label: 'In progress', color: reportColors.doing, dash: '9 3' },
  { key: 'done', label: 'Done', color: reportColors.done },
  { key: 'rondeled', label: 'Rondeled', color: reportColors.rondeled, dash: '12 3 2 3' },
  { key: 'canceled', label: 'Canceled', color: reportColors.canceled, dash: '2 4' },
]

export function ActivityTimeline({ days }: { days: ReportTimelineDay[] }) {
  const [hidden, setHidden] = useState<string[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const keyboardNavigation = useRef(false)
  const visible = series.filter((item) => !hidden.includes(item.key))
  const maximum = Math.max(1, ...days.flatMap((day) => visible.map((item) => day[item.key])))
  const step = Math.max(1, Math.ceil(maximum / 4))
  const ticks = [...new Set([...Array.from({ length: Math.floor(maximum / step) + 1 }, (_, index) => index * step), maximum])]
  const x = (index: number) => days.length === 1 ? 450 : 42 + index / (days.length - 1) * 816
  const y = (count: number) => 180 - count / maximum * 150
  const index = selected === null ? null : Math.min(selected, days.length - 1)
  const day = index === null ? null : days[index]
  const labels = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])]
  const pointAt = (event: PointerEvent<SVGSVGElement>) => {
    // Scrolling into focus can dispatch mouse movement without the pointer moving.
    if (keyboardNavigation.current && event.pointerType === 'mouse' && !event.movementX && !event.movementY) return
    keyboardNavigation.current = false
    const box = event.currentTarget.getBoundingClientRect()
    const position = ((event.clientX - box.left) / box.width * 900 - 42) / 816
    setSelected(Math.max(0, Math.min(days.length - 1, Math.round(position * (days.length - 1)))))
  }
  const navigate = (event: KeyboardEvent) => {
    let next = index ?? days.length - 1
    if (event.key === 'ArrowLeft') next--
    else if (event.key === 'ArrowRight') next++
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = days.length - 1
    else return
    event.preventDefault()
    keyboardNavigation.current = true
    setSelected(Math.max(0, Math.min(days.length - 1, next)))
  }
  return (
    <div className="activity-timeline">
      <div className="activity-timeline-key" role="group" aria-label="Timeline lines">
        {series.map((item) => <button key={item.key} type="button" aria-pressed={!hidden.includes(item.key)}
          onMouseEnter={() => setActive(item.key)} onMouseLeave={() => setActive(null)}
          onFocus={() => setActive(item.key)} onBlur={() => setActive(null)}
          onClick={() => { setHidden((keys) => keys.includes(item.key) ? keys.filter((key) => key !== item.key) : [...keys, item.key]); setActive(null) }}>
          <svg width="26" height="12" aria-hidden="true"><line x1="0" x2="26" y1="6" y2="6" stroke={item.color} strokeWidth="3" strokeDasharray={item.dash} /></svg>{item.label}
        </button>)}
      </div>
      <div className="activity-timeline-plot" role="group" aria-label="Explore daily report values" tabIndex={0}
        onKeyDown={navigate} onFocus={(event) => { if (event.target === event.currentTarget) { keyboardNavigation.current = true; setSelected(days.length - 1) } }}
        onBlur={() => setSelected(null)}>
        <svg viewBox="0 0 900 220" role="img" aria-label="Task activity over time" onPointerMove={pointAt} onPointerLeave={() => { if (!keyboardNavigation.current) setSelected(null) }}>
          {ticks.map((count) => <g key={count} className="activity-timeline-grid">
            <line x1="42" x2="858" y1={y(count)} y2={y(count)} /><text x="30" y={y(count) + 4} textAnchor="end">{count}</text>
          </g>)}
          {[...visible].sort((a, b) => Number(a.key === active) - Number(b.key === active)).map((item) => <g key={item.key} data-series={item.key} opacity={active && active !== item.key ? 0.2 : 1}>
            <polyline points={days.map((point, i) => `${x(i)},${y(point[item.key])}`).join(' ')} fill="none"
              stroke={item.color} strokeWidth={active === item.key ? 4 : 2.5} strokeDasharray={item.dash} />
            {(index === null ? days.length <= 31 ? days.map((_, i) => i) : [] : [index]).map((i) =>
              <circle key={i} cx={x(i)} cy={y(days[i][item.key])} r={index === i ? 4 : 2} fill={item.color} />)}
          </g>)}
          {index !== null && <line x1={x(index)} x2={x(index)} y1="24" y2="180" className="activity-timeline-crosshair" />}
          {labels.filter((i) => i >= 0).map((i) => <text key={i} className="activity-timeline-date" x={x(i)} y="210" textAnchor="middle">{formatShort(days[i].date)}</text>)}
        </svg>
        {day && <div className="activity-timeline-tooltip" role="tooltip"><strong>{reportDate(day.date)}</strong>
          <dl>{visible.map((item) => <div key={item.key}><dt><i style={{ background: item.color }} />{item.label}</dt><dd>{day[item.key]}</dd></div>)}</dl>
        </div>}
      </div>
    </div>
  )
}
