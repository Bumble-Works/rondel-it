import type { Tag, TaskStatus } from '../../domain/types'
import { Icon, type IconName } from '../../shared/ui/Icon'
import { Menu, MenuItem } from '../../shared/ui/Menu'
import { StatusCircle } from '../../shared/ui/StatusCircle'
import { features } from '../../shared/features'
import './Sidebar.css'

export type ViewKey = 'day' | 'week' | 'month' | 'rondel'

interface NavItem {
  key: ViewKey
  label: string
  icon: IconName
}

const NAV: NavItem[] = [
  { key: 'day', label: 'Day', icon: 'sun' },
  { key: 'week', label: 'Week', icon: 'calendar' },
  { key: 'month', label: 'Month', icon: 'layers' },
  { key: 'rondel', label: 'Bucket List', icon: 'inbox' },
]

const STATUS_ITEMS: Array<{ key: TaskStatus; label: string }> = [
  { key: 'todo', label: 'To do' },
  { key: 'doing', label: 'Doing' },
  { key: 'done', label: 'Done' },
  { key: 'canceled', label: 'Canceled' },
]

interface SidebarProps {
  activeView: ViewKey
  onSelectView: (view: ViewKey) => void
  tags: Tag[]
  activeTagIds: string[]
  onToggleTag: (tagId: string) => void
  onResetTags: () => void
  tagMatchMode: 'any' | 'all'
  onSetTagMatchMode: (mode: 'any' | 'all') => void
  activeStatuses: TaskStatus[]
  onToggleStatus: (status: TaskStatus) => void
  onResetStatuses: () => void
  onOpenSettings: () => void
  onOpenRecurring: () => void
  onOpenReports: () => void
}

export function Sidebar({
  activeView,
  onSelectView,
  tags,
  activeTagIds,
  onToggleTag,
  onResetTags,
  tagMatchMode,
  onSetTagMatchMode,
  activeStatuses,
  onToggleStatus,
  onResetStatuses,
  onOpenSettings,
  onOpenRecurring,
  onOpenReports,
}: SidebarProps) {
  const allStatuses = activeStatuses.length === 0
  const allTags = activeTagIds.length === 0
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/icon.svg" alt="" className="sidebar-logo" width={30} height={30} />
        <span className="sidebar-wordmark">
          Rondel <span>it</span>
        </span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sidebar-link ${activeView === item.key ? 'is-active' : ''}`.trim()}
            onClick={() => onSelectView(item.key)}
          >
            <span className="sidebar-link-icon">
              <Icon name={item.icon} size={18} />
            </span>
            <span className="sidebar-link-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-section sidebar-section--status">
        <div className="sidebar-section-head">
          <span>Status</span>
        </div>
        <div className="sidebar-pills">
          <button
            type="button"
            className={`sidebar-pill ${allStatuses ? 'is-active' : ''}`.trim()}
            onClick={onResetStatuses}
          >
            All statuses
          </button>
          {STATUS_ITEMS.map((item) => {
            const on = activeStatuses.includes(item.key)
            return (
              <button
                key={item.key}
                type="button"
                className={`sidebar-pill sidebar-pill--status ${on ? 'is-active' : ''}`.trim()}
                onClick={() => onToggleStatus(item.key)}
              >
                <StatusCircle status={item.key} presentational size={15} />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-head sidebar-section-head--row">
          <span>Tags</span>
          {activeTagIds.length > 1 && (
            <Menu
              align="left"
              trigger={({ onClick, 'aria-expanded': expanded }) => (
                <button
                  type="button"
                  className={`sidebar-match ${expanded ? 'is-open' : ''}`.trim()}
                  onClick={onClick}
                >
                  {tagMatchMode === 'all' ? 'All selected' : 'Any selected'}
                  <Icon name="chevron-down" size={13} />
                </button>
              )}
            >
              {(close) => (
                <>
                  <MenuItem
                    icon={
                      <span className="sidebar-match-check">
                        {tagMatchMode === 'any' && <Icon name="check" size={15} />}
                      </span>
                    }
                    onClick={() => {
                      onSetTagMatchMode('any')
                      close()
                    }}
                  >
                    Any selected
                  </MenuItem>
                  <MenuItem
                    icon={
                      <span className="sidebar-match-check">
                        {tagMatchMode === 'all' && <Icon name="check" size={15} />}
                      </span>
                    }
                    onClick={() => {
                      onSetTagMatchMode('all')
                      close()
                    }}
                  >
                    All selected
                  </MenuItem>
                </>
              )}
            </Menu>
          )}
        </div>
        <div className="sidebar-pills">
          <button
            type="button"
            className={`sidebar-pill ${allTags ? 'is-active' : ''}`.trim()}
            onClick={onResetTags}
          >
            All tags
          </button>
          {tags.map((tag) => {
            const on = activeTagIds.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                className={`sidebar-pill ${on ? 'is-active' : ''}`.trim()}
                onClick={() => onToggleTag(tag.id)}
              >
                <span className="sidebar-pill-dot" style={{ background: tag.color }} />
                <span className="sidebar-pill-label">{tag.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="sidebar-foot">
        {features.reports && (
          <button type="button" className="sidebar-link" onClick={onOpenReports}>
            <span className="sidebar-link-icon"><Icon name="chart" size={18} /></span>
            <span className="sidebar-link-label">Reports</span>
          </button>
        )}
        <button type="button" className="sidebar-link" onClick={onOpenRecurring}>
          <span className="sidebar-link-icon">
            <Icon name="repeat" size={18} />
          </span>
          <span className="sidebar-link-label">Recurring</span>
        </button>
        <button type="button" className="sidebar-link" onClick={onOpenSettings}>
          <span className="sidebar-link-icon">
            <Icon name="gear" size={18} />
          </span>
          <span className="sidebar-link-label">Settings</span>
        </button>
      </div>
    </aside>
  )
}
