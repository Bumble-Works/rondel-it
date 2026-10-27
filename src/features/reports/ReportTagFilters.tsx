import type { Tag } from '../../domain/types'
import { Button } from '../../shared/ui/Button'
import './ReportTagFilters.css'

interface ReportTagFiltersProps {
  tags: Tag[]
  selected: string[]
  match: 'any' | 'all'
  onToggle: (id: string) => void
  onClear: () => void
  onMatch: (match: 'any' | 'all') => void
}

export function ReportTagFilters({ tags, selected, match, onToggle, onClear, onMatch }: ReportTagFiltersProps) {
  if (!tags.length) return null
  return (
    <section className="reports-tag-filter" aria-label="Filter reports by tag">
      <div className="reports-tag-actions">
        <span>Focus on</span>
        <Button size="sm" variant="ghost" aria-pressed={selected.length === 0} onClick={onClear}>All tags</Button>
        {selected.length > 1 && <label>Match
          <select value={match} onChange={(event) => onMatch(event.target.value as 'any' | 'all')}>
            <option value="any">Any selected tag</option><option value="all">All selected tags</option>
          </select>
        </label>}
      </div>
      <div className="reports-tag-buttons">{tags.map((tag) => <button key={tag.id} type="button"
        aria-pressed={selected.includes(tag.id)} onClick={() => onToggle(tag.id)}>
        <i style={{ background: tag.color }} />#{tag.name}
      </button>)}</div>
    </section>
  )
}
