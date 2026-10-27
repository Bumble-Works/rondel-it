import type { Tag, TaskStatus } from '../../domain/types'
import { STATUS_LABEL, STATUS_COLOR } from '../../shared/taskStatus'
import { Icon } from '../../shared/ui/Icon'
import { Menu } from '../../shared/ui/Menu'
import { TagChip } from '../../shared/ui/TagChip'
import './ActiveFilters.css'

interface ActiveFiltersProps {
  activeTagIds: string[]
  activeStatuses: TaskStatus[]
  tagsById: Map<string, Tag>
  resetTagFilter: () => void
  resetStatuses: () => void
  toggleStatus: (status: TaskStatus) => void
  toggleTagFilter: (id: string) => void
}

export function ActiveFilters({ activeTagIds, activeStatuses, tagsById, resetTagFilter, resetStatuses, toggleStatus, toggleTagFilter }: ActiveFiltersProps) {
  if (!activeTagIds.length && !activeStatuses.length) return null
  return (
    <Menu
      align="right"
      trigger={({ onClick, 'aria-expanded': expanded }) => (
        <button
          type="button"
          className={`app-filter-btn ${expanded ? 'is-open' : ''}`.trim()}
          onClick={onClick}
        >
          <Icon name="filter" size={15} />
          <span>Filters</span>
          <span className="app-filter-count">{activeTagIds.length + activeStatuses.length}</span>
        </button>
      )}
    >
      {(close) => (
        <div className="filter-panel">
          <div className="filter-panel-head">
            <span>Active filters</span>
            <button
              type="button"
              className="filter-panel-clear"
              onClick={() => {
                resetTagFilter()
                resetStatuses()
                close()
              }}
            >
              Clear all
            </button>
          </div>

          {activeStatuses.length > 0 && (
            <div className="filter-panel-group">
              <div className="filter-panel-label">Status</div>
              <div className="filter-panel-chips">
                {activeStatuses.map((status) => (
                  <TagChip
                    key={status}
                    name={STATUS_LABEL[status]}
                    color={STATUS_COLOR[status]}
                    onRemove={() => toggleStatus(status)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTagIds.length > 0 && (
            <div className="filter-panel-group">
              <div className="filter-panel-label">Tags</div>
              <div className="filter-panel-chips">
                {activeTagIds.map((id) => {
                  const tag = tagsById.get(id)
                  if (!tag) return null
                  return (
                    <TagChip
                      key={id}
                      name={tag.name}
                      color={tag.color}
                      onRemove={() => toggleTagFilter(id)}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Menu>
  )
}
