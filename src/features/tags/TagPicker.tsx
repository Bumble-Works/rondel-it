import { useState } from 'react'
import type { Tag } from '../../domain/types'
import { Icon } from '../../shared/ui/Icon'
import { Menu, MenuItem, MenuLabel } from '../../shared/ui/Menu'
import { TagChip } from '../../shared/ui/TagChip'
import './TagPicker.css'

interface TagPickerProps {
  tags: Tag[]
  selectedIds: string[]
  onToggle: (tagId: string) => void
  onCreate: (name: string) => void
  className?: string
}

/** The chosen tags as chips, plus a "+ Tag" menu to toggle or create one. */
export function TagPicker({ tags, selectedIds, onToggle, onCreate, className = '' }: TagPickerProps) {
  const [newTag, setNewTag] = useState('')
  const selected = selectedIds.map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => Boolean(t))

  return (
    <div className={`tag-picker ${className}`.trim()}>
      {selected.map((tag) => (
        <TagChip key={tag.id} name={tag.name} color={tag.color} onRemove={() => onToggle(tag.id)} />
      ))}
      <Menu
        align="left"
        trigger={({ onClick, 'aria-expanded': expanded }) => (
          <button
            type="button"
            className={`tag-picker-add ${expanded ? 'is-open' : ''}`.trim()}
            onClick={onClick}
          >
            <Icon name="plus" size={14} /> Tag
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuLabel>Toggle tags</MenuLabel>
            {tags.map((tag) => (
              <MenuItem
                key={tag.id}
                icon={<span className="tag-picker-swatch" style={{ background: tag.color }} />}
                onClick={() => {
                  onToggle(tag.id)
                  close()
                }}
              >
                {tag.name}
                {selectedIds.includes(tag.id) && <Icon name="check" size={15} />}
              </MenuItem>
            ))}
            <div className="tag-picker-create">
              <input
                className="tag-picker-create-input"
                placeholder="Create a tag…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTag.trim()) {
                    onCreate(newTag.trim())
                    setNewTag('')
                    close()
                  }
                }}
              />
            </div>
          </>
        )}
      </Menu>
    </div>
  )
}
