import { useRef, useState } from 'react'
import type { Tag } from '../../domain/types'
import { Icon } from '../../shared/ui/Icon'
import { Menu, MenuLabel } from '../../shared/ui/Menu'
import { TagChip } from '../../shared/ui/TagChip'
import { RecurringTagHint } from './RecurringTagHint'
import './TagPicker.css'

interface TagPickerProps {
  tags: Tag[]
  selectedIds: string[]
  onToggle: (tagId: string) => void
  onCreate: (name: string) => void
  onRemove?: (tagId: string) => void
  className?: string
  disabledReason?: string | null
  recurringOccurrence?: boolean
}

/** Search and toggle several tags without leaving the list. */
export function TagPicker({
  tags, selectedIds, onToggle, onCreate, onRemove = onToggle,
  className = '', disabledReason, recurringOccurrence = false,
}: TagPickerProps) {
  const [newTag, setNewTag] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = selectedIds.map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => Boolean(t))
  const matches = tags.filter((tag) => tag.name.toLowerCase().includes(newTag.trim().toLowerCase()))
  const canCreate = newTag.trim() && !tags.some((tag) => tag.name.toLowerCase() === newTag.trim().toLowerCase())

  return (
    <div className={`tag-picker ${className}`.trim()}>
      {selected.map((tag) => (
        <TagChip key={tag.id} name={tag.name} color={tag.color} size="sm" onRemove={disabledReason ? undefined : () => onRemove(tag.id)} />
      ))}
      <Menu
        align="left"
        trigger={({ onClick, 'aria-expanded': expanded }) => (
          <button
            type="button"
            className={`tag-picker-add ${expanded ? 'is-open' : ''}`.trim()}
            onClick={onClick}
            aria-expanded={expanded}
            disabled={Boolean(disabledReason)}
            title={disabledReason ?? 'Add or remove tags'}
          >
            <Icon name="plus" size={14} /> Tags
          </button>
        )}
      >
        {() => (
          <>
            <MenuLabel>Toggle tags</MenuLabel>
            <input
              ref={searchRef}
              className="tag-picker-search"
              aria-label="Find or create a tag"
              placeholder="Find or create a tag…"
              value={newTag}
              autoFocus
              onChange={(e) => setNewTag(e.target.value)}
            />
            <div className="tag-picker-options">
              {matches.map((tag) => (
                <button
                  type="button"
                  className="menu-item"
                  role="menuitemcheckbox"
                  aria-checked={selectedIds.includes(tag.id)}
                  key={tag.id}
                  onClick={() => onToggle(tag.id)}
                >
                  <span className="tag-picker-swatch" style={{ background: tag.color }} />
                  <span className="menu-item-label">{tag.name}</span>
                  {selectedIds.includes(tag.id) && <Icon name="check" size={15} />}
                </button>
              ))}
            </div>
            {canCreate && (
              <button
                type="button"
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  onCreate(newTag.trim())
                  setNewTag('')
                  searchRef.current?.focus()
                }}
              >
                <Icon name="plus" size={14} /> Create #{newTag.trim()}
              </button>
            )}
            {!matches.length && !canCreate && <p className="tag-picker-empty">Type a name to create your first tag.</p>}
            {recurringOccurrence && <RecurringTagHint />}
          </>
        )}
      </Menu>
    </div>
  )
}
