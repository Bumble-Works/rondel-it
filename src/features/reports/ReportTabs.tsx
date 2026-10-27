import { useRef, type KeyboardEvent } from 'react'
import './ReportTabs.css'

export type ReportView = 'dashboard' | 'tasks'

const views: { id: ReportView; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'Tasks' },
]

export function ReportTabs({ view, onChange }: { view: ReportView; onChange: (view: ReportView) => void }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const navigate = (event: KeyboardEvent, index: number) => {
    let next: number
    if (event.key === 'ArrowRight') next = (index + 1) % views.length
    else if (event.key === 'ArrowLeft') next = (index + views.length - 1) % views.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = views.length - 1
    else return
    event.preventDefault()
    onChange(views[next].id)
    buttons.current[next]?.focus()
  }
  return (
    <div className="report-tabs" role="tablist" aria-label="Report view">
      {views.map((item, index) => <button key={item.id} type="button" role="tab"
        id={`report-tab-${item.id}`} aria-selected={view === item.id} aria-controls="report-view-panel"
        tabIndex={view === item.id ? 0 : -1} ref={(element) => { buttons.current[index] = element }}
        onClick={() => onChange(item.id)} onKeyDown={(event) => navigate(event, index)}>
        {item.label}
      </button>)}
    </div>
  )
}
