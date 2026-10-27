import type { TaskStatus } from '../../domain/types'
import { FILTERABLE_STATUSES } from '../../shared/taskStatus'
import { PillButton } from '../../shared/ui/PillButton'
import { StatusCircle } from '../../shared/ui/StatusCircle'
import { reportStatus } from './reportPresentation'
import './ReportStatusFilters.css'

interface ReportStatusFiltersProps {
  selected: TaskStatus[]
  onToggle: (status: TaskStatus) => void
  onClear: () => void
}

export function ReportStatusFilters({ selected, onToggle, onClear }: ReportStatusFiltersProps) {
  return (
    <div className="report-status-filters" role="group" aria-label="Filter tasks by status">
      <span>Status</span>
      <PillButton aria-pressed={selected.length === 0} onClick={onClear}>All statuses</PillButton>
      {FILTERABLE_STATUSES.map((status) => <PillButton key={status} aria-pressed={selected.includes(status)} onClick={() => onToggle(status)}
        tone={status === 'done' ? 'done' : status === 'canceled' ? 'cancel' : 'default'}>
        <StatusCircle status={status} presentational size={14} />{reportStatus[status]}
      </PillButton>)}
    </div>
  )
}
