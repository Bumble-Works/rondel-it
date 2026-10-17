import type { Tag } from '../../domain/types'
import { Icon } from '../../shared/ui/Icon'
import { TagChip } from '../../shared/ui/TagChip'
import { HashTagMenu } from '../tags/HashTagMenu'
import { useHashTagInput } from '../tags/useHashTagInput'
import './InlineAdd.css'

interface InlineAddProps {
  onAdd: (title: string, tagIds: string[]) => void
  tags: Tag[]
  onCreateTag: (name: string) => Promise<Tag | null>
  placeholder?: string
}

export function InlineAdd({ onAdd, tags, onCreateTag, placeholder = 'Add a task' }: InlineAddProps) {
  const input = useHashTagInput({ tags, onCreateTag })
  const picked = input.tagIds.map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => Boolean(t))

  const submit = () => {
    const title = input.text.trim()
    if (!title) return
    onAdd(title, input.tagIds)
    input.reset()
  }

  return (
    <div className={`inline-add ${input.text || picked.length ? 'is-active' : ''}`.trim()}>
      <span className="inline-add-icon">
        <Icon name="plus" size={16} />
      </span>
      <input
        {...input.inputProps}
        className="inline-add-input"
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (input.handleKey(e)) return
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') input.reset()
        }}
        onBlur={(e) => {
          // Focus moving to a chip's remove button stays inside the widget.
          if (e.currentTarget.parentElement?.contains(e.relatedTarget)) return
          submit()
        }}
      />
      {picked.map((tag) => (
        <TagChip
          key={tag.id}
          name={tag.name}
          color={tag.color}
          size="sm"
          onRemove={() => {
            input.removeTag(tag.id)
            input.inputRef.current?.focus()
          }}
        />
      ))}
      {input.open && <HashTagMenu options={input.options} highlight={input.highlight} onPick={input.pick} />}
    </div>
  )
}
