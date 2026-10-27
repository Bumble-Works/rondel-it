import type { CSSProperties } from 'react'
import type { Dashboard, ReportActivity } from '../../domain/reportTypes'
import { reportColors } from './reportColors'
import './ReportHighlights.css'

const cards: { key: keyof ReportActivity; label: string; caption: string; description: string }[] = [
  { key: 'todo', label: 'To do', caption: '✨ Ready when you are', description: 'To-dos on your list during this period that are still unfinished.' },
  { key: 'doing', label: 'In progress', caption: '💭 Still on your mind', description: 'Tasks from this period that are currently in progress.' },
  { key: 'done', label: 'Done', caption: '🎉 Look at you go', description: 'Tasks completed in this period.' },
  { key: 'rondeled', label: 'Rondeled', caption: 'A little reshuffling', description: 'Times you rondeled a task in this period.' },
  { key: 'canceled', label: 'Canceled', caption: '🧹 Great job prioritizing', description: 'Tasks canceled in this period.' },
]

const leftBehindDescription = 'Unfinished to-dos still dated in the past.'
const cardStyle = (key: keyof typeof reportColors) => ({ '--report-color': reportColors[key] }) as CSSProperties

export function ReportHighlights({ dashboard, onLeftBehind }: { dashboard: Dashboard; onLeftBehind: () => void }) {
  return (
    <div className="report-highlights">{cards.map(({ key, label, caption, description }) => (
      <div key={key} className="report-highlight" style={cardStyle(key)} title={description}>
        <span>{label}</span><strong>{dashboard.activity[key]}</strong>
        <small>{key === 'rondeled' && <img src="/icon.svg" alt="" width={14} height={14} />}{caption}</small>
      </div>
    ))}
      <div className="report-highlight" style={cardStyle('leftBehind')} title={leftBehindDescription}>
        <span>Left behind</span>
        <button type="button" className="report-highlight-count" onClick={onLeftBehind} disabled={dashboard.leftBehindIds.length === 0}
          aria-description={leftBehindDescription}
          aria-label={`Show ${dashboard.leftBehindIds.length} ${dashboard.leftBehindIds.length === 1 ? 'task' : 'tasks'} left behind`}>
          {dashboard.leftBehindIds.length}
        </button>
        <small>{dashboard.leftBehindIds.length === 0 ? '🌟 All clear nicely done' : '🧭 Needs some attention'}</small>
      </div>
    </div>
  )
}
