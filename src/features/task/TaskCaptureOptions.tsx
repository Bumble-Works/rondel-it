import type { Tag } from '../../domain/types'
import { formatClock } from '../../domain/dates'
import { TimePicker } from '../reminders/TimePicker'
import { TagPicker } from '../tags/TagPicker'
import type { useTaskCapture } from './useTaskCapture'
import './TaskCaptureOptions.css'

interface TaskCaptureOptionsProps {
  input: ReturnType<typeof useTaskCapture>
  tags: Tag[]
  onCreateTag: (name: string) => Promise<Tag | null>
  canSetTime: boolean
}

export function TaskCaptureOptions({ input, tags, onCreateTag, canSetTime }: TaskCaptureOptionsProps) {
  return (
    <div className="task-capture-options">
      <TagPicker tags={tags} selectedIds={input.tagIds} onToggle={input.toggleTag} onRemove={(id) => {
        input.removeTag(id)
        input.inputRef.current?.focus()
      }} onCreate={async (name) => {
        const tag = await onCreateTag(name)
        if (tag) input.toggleTag(tag.id)
      }} />
      <TimePicker value={input.time} onChange={input.changeTime}
        disabledReason={canSetTime ? null : 'Give it a day to set a reminder.'} />
      {input.suggestion && (
        <button type="button" className="task-capture-time" onMouseDown={(e) => e.preventDefault()} onClick={input.pickTime}>
          Set reminder for {formatClock(input.suggestion.time)}
        </button>
      )}
    </div>
  )
}
