import type { Tag } from '../../domain/types'
import { Icon } from '../../shared/ui/Icon'
import { HashTagMenu } from '../tags/HashTagMenu'
import { useTaskCapture } from '../task/useTaskCapture'
import { TaskCaptureOptions } from '../task/TaskCaptureOptions'
import './InlineAdd.css'

interface InlineAddProps {
  onAdd: (title: string, tagIds: string[], reminderTime: string | null) => void
  tags: Tag[]
  onCreateTag: (name: string) => Promise<Tag | null>
  placeholder?: string
  canSetTime?: boolean
}

export function InlineAdd({ onAdd, tags, onCreateTag, placeholder = 'Add a task', canSetTime = true }: InlineAddProps) {
  const input = useTaskCapture(tags, onCreateTag, canSetTime)

  const submit = () => {
    const title = input.text.trim()
    if (!title) return
    onAdd(title, input.tagIds, input.time)
    input.reset()
  }

  return (
    <div className={`inline-add ${input.text || input.tagIds.length ? 'is-active' : ''}`.trim()}>
      <button type="button" className="inline-add-icon" aria-label="Add task to this list" disabled={!input.text.trim()} onClick={submit}>
        <Icon name="plus" size={16} />
      </button>
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
          input.dismiss()
          // Focus moving to a chip's remove button stays inside the widget.
          if (e.currentTarget.parentElement?.contains(e.relatedTarget) ||
            (e.relatedTarget instanceof Element && e.relatedTarget.closest('.menu-panel'))) return
          submit()
        }}
      />
      <TaskCaptureOptions input={input} tags={tags} onCreateTag={onCreateTag} canSetTime={canSetTime} />
      {input.open && <HashTagMenu anchorRef={input.inputRef} options={input.options} highlight={input.highlight} onPick={input.pick} />}
    </div>
  )
}
