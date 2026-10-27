import { canRemind, CANCELED_REOPEN_HINT, CARRIED_FORWARD_HINT, isCarriedForward } from '../../domain/rondel'
import type { Tag, Task } from '../../domain/types'
import { ChoiceModal } from '../../shared/ui/ChoiceModal'
import { TagPicker } from '../tags/TagPicker'
import { TimePicker } from '../reminders/TimePicker'
import { useReminderChange } from '../reminders/useReminderChange'
import type { ReminderScope } from '../reminders/ReminderField'
import { OPEN_IN_PANEL_HINT } from '../task/hints'
import './TaskRowMetadata.css'

interface TaskRowMetadataProps {
  task: Task
  tags: Tag[]
  locked: boolean
  onToggleTag: (id: string) => void
  onCreateTag: (name: string) => void
  onChangeReminder: (time: string | null, scope: ReminderScope) => void
}

export function TaskRowMetadata({ task, tags, locked, onToggleTag, onCreateTag, onChangeReminder }: TaskRowMetadataProps) {
  const disabledReason = locked ? OPEN_IN_PANEL_HINT : isCarriedForward(task) ? CARRIED_FORWARD_HINT
    : task.status === 'canceled' ? CANCELED_REOPEN_HINT : null
  const { commit, choice } = useReminderChange(task, onChangeReminder)
  return (
    <div className="task-row-metadata">
      <div className="task-row-controls">
        <TagPicker tags={tags} selectedIds={task.tagIds} onToggle={onToggleTag} onCreate={onCreateTag}
          disabledReason={disabledReason} recurringOccurrence={Boolean(task.recurringRuleId)} />
        <TimePicker value={task.reminderTime} onChange={commit}
          disabledReason={disabledReason ?? (canRemind(task) ? null : 'Give it a day to set a reminder.')} />
        <ChoiceModal {...choice} />
      </div>
    </div>
  )
}
