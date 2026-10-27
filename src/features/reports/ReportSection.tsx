import type { ReactNode } from 'react'
import { Icon } from '../../shared/ui/Icon'
import './ReportSection.css'

interface ReportSectionProps {
  title: string
  description?: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
  wide?: boolean
}

export function ReportSection({ title, description, collapsed, onToggle, children, wide }: ReportSectionProps) {
  return (
    <section className={`report-section${collapsed ? ' is-collapsed' : ''}${wide ? ' report-section--wide' : ''}`}>
      <button type="button" className="report-section-heading" aria-expanded={!collapsed} onClick={onToggle}>
        <span><h2>{title}</h2>{description && <span className="report-section-description">{description}</span>}</span>
        <Icon name={collapsed ? 'plus' : 'chevron-down'} size={18} />
      </button>
      {!collapsed && <div className="report-section-body">{children}</div>}
    </section>
  )
}
