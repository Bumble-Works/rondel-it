import { useDraggable, useDroppable } from '@dnd-kit/core'
import { rowDropId, type DropPosition } from './boardDrop'
import type { RondelTarget } from '../../services/adapters/DataSource'
import { CANCELED_REOPEN_HINT, CARRIED_FORWARD_HINT, isCarriedForward, rondelBlockedReason } from '../../domain/rondel'
import type { Tag, Task } from '../../domain/types'
import { Icon } from '../../shared/ui/Icon'
import { StatusCircle } from '../../shared/ui/StatusCircle'
import { LinkifiedText } from '../../shared/ui/LinkifiedText'
import type { ReminderScope } from '../reminders/ReminderField'
import { TaskRowMetadata } from './TaskRowMetadata'
import { RondelMenu } from '../rondel/RondelMenu'
import { OPEN_IN_PANEL_HINT } from '../task/hints'
import { TaskMoreMenu } from './TaskMoreMenu'
import './TaskRow.css'

// Note and rondel sit side by side, so they're drawn the same size. The note
// glyph fills less of its box than the rondel logo does, hence the numbers.
const NOTE_ICON = 26
const RONDEL_ICON = 18

interface TaskRowProps {
  task: Task
  tagsById: Map<string, Tag>
  /** For a recurring task: its rule's pattern, e.g. "Every day". */
  repeatLabel?: string
  selected: boolean
  onOpen: () => void
  onAdvance: () => void
  onSetDone: () => void
  onRondel: (target: RondelTarget) => void
  onPickDate: () => void
  onOpenNote: () => void
  onToggleFlag: () => void
  onCancel: () => void
  /** Makes a fresh to-do copy on that day. */
  onCopy: (dayIso: string) => void
  onPickCopyDate: () => void
  onOpenReminder: () => void
  onToggleTag: (id: string) => void
  onCreateTag: (name: string) => void
  onChangeReminder: (time: string | null, scope: ReminderScope) => void
  isDragged: boolean
  /** Where a task being dragged over this row would land. */
  dropPosition: DropPosition | null
  weekStartDay?: number
}

export function TaskRow({
  task,
  tagsById,
  repeatLabel,
  selected,
  onOpen,
  onAdvance,
  onSetDone,
  onRondel,
  onPickDate,
  onOpenNote,
  onToggleFlag,
  onCancel,
  onCopy,
  onPickCopyDate,
  onOpenReminder,
  onToggleTag,
  onCreateTag,
  onChangeReminder,
  isDragged,
  dropPosition,
  weekStartDay,
}: TaskRowProps) {
  const carried = isCarriedForward(task)
  const taskIsCanceled = task.status === 'canceled'
  // While a task is open in the detail panel, the panel is its only editor.
  const locked = selected
  const draggable = (task.status === 'todo' || task.status === 'doing') && !carried && !locked
  // The row is what's dragged and what's dropped on; only its grip starts a drag.
  const { setNodeRef: setDragRef, setActivatorNodeRef, listeners } = useDraggable({ id: task.id, disabled: !draggable })
  const { setNodeRef: setDropRef } = useDroppable({ id: rowDropId(task.id) })
  const setRowRef = (el: HTMLDivElement | null) => {
    setDragRef(el)
    setDropRef(el)
  }

  return (
    <div
      ref={setRowRef}
      className={[
        'task-row',
        selected ? 'is-selected' : '',
        task.status === 'done' ? 'is-done' : '',
        taskIsCanceled ? 'is-canceled' : '',
        task.flagged ? 'is-flagged' : '',
        carried ? 'is-carried' : '',
        isDragged ? 'is-dragged' : '',
        dropPosition === 'before' ? 'is-drop-before' : '',
        dropPosition === 'after' ? 'is-drop-after' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!draggable ? (
        <span className="task-grip task-grip--empty" aria-hidden="true" />
      ) : (
        <span
          ref={setActivatorNodeRef}
          className="task-grip"
          aria-label="Drag to move or reorder"
          title="Drag to move or reorder"
          {...listeners}
        >
          <Icon name="grip" size={16} />
        </span>
      )}

      <StatusCircle
        status={task.status}
        onClick={onAdvance}
        onDoubleClick={onSetDone}
        disabled={locked || carried || taskIsCanceled || (!task.dayDate && !taskIsCanceled)}
        disabledTitle={
          locked ? OPEN_IN_PANEL_HINT : carried ? CARRIED_FORWARD_HINT : taskIsCanceled ? CANCELED_REOPEN_HINT : undefined
        }
      />

      {/*
        The title and note can contain links, which can't go inside a button.
        So an invisible "open" button covers the text area from behind, and the
        links sit on top of it: siblings, not nested.
      */}
      <div className="task-main">
        <button
          type="button"
          className="task-open"
          aria-label={`Open ${task.title}`}
          title={carried ? CARRIED_FORWARD_HINT : undefined}
          onClick={onOpen}
        />
        <span className="task-title">
          {task.flagged && (
            <span className="task-flag-mark" title="Important">
              <Icon name="flag-filled" size={13} />
            </span>
          )}
          {task.recurringRuleId && (
            <span
              className="task-recur"
              role="img"
              aria-label="Recurring task"
              title={repeatLabel ? `Recurring: ${repeatLabel}` : 'Recurring task'}
            >
              <Icon name="repeat" size={13} />
            </span>
          )}
          <LinkifiedText text={task.title} />
        </span>
        <TaskRowMetadata task={task} tags={[...tagsById.values()]} locked={locked}
          onToggleTag={onToggleTag} onCreateTag={onCreateTag} onChangeReminder={onChangeReminder} />
      </div>

      <div className="task-actions">
        <button
          type="button"
          className={`task-note-btn ${task.note ? 'has-note' : ''}`.trim()}
          aria-label={task.note ? 'Edit note' : 'Add note'}
          title={locked ? OPEN_IN_PANEL_HINT : task.note ? 'Edit note' : 'Add note'}
          disabled={locked}
          onClick={onOpenNote}
        >
          <Icon name={task.note ? 'note-filled' : 'note'} size={NOTE_ICON} />
        </button>
        <RondelMenu
          onRondel={onRondel}
          onPickDate={onPickDate}
          weekStartDay={weekStartDay}
          disabledReason={locked ? OPEN_IN_PANEL_HINT : rondelBlockedReason(task)}
          inBucketList={task.bucket !== null}
          size={RONDEL_ICON}
        />
        <TaskMoreMenu
          task={task}
          disabledReason={locked ? OPEN_IN_PANEL_HINT : null}
          onCopy={onCopy}
          onPickCopyDate={onPickCopyDate}
          onToggleFlag={onToggleFlag}
          onOpenReminder={onOpenReminder}
          onReopen={onAdvance}
          onCancel={onCancel}
        />
      </div>
    </div>
  )
}
