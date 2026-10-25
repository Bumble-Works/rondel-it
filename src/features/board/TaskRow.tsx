import { useDraggable, useDroppable } from '@dnd-kit/core'
import { rowDropId, type DropPosition } from './boardDrop'
import type { RondelTarget } from '../../services/adapters/DataSource'
import { formatClock } from '../../domain/dates'
import { CARRIED_FORWARD_HINT, isCarriedForward, rondelBlockedReason } from '../../domain/rondel'
import type { Tag, Task } from '../../domain/types'
import { Icon } from '../../shared/ui/Icon'
import { StatusCircle } from '../../shared/ui/StatusCircle'
import { LinkifiedText } from '../../shared/ui/LinkifiedText'
import { TagChip } from '../../shared/ui/TagChip'
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
  isDragged,
  dropPosition,
  weekStartDay,
}: TaskRowProps) {
  const tags = task.tagIds.map((id) => tagsById.get(id)).filter((t): t is Tag => Boolean(t))
  const carried = isCarriedForward(task)
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
        task.status === 'canceled' ? 'is-canceled' : '',
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
        disabled={locked || carried || (!task.dayDate && task.status !== 'canceled')}
        disabledTitle={locked ? OPEN_IN_PANEL_HINT : carried ? CARRIED_FORWARD_HINT : undefined}
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
        {(tags.length > 0 || task.note || task.reminderTime) && (
          <span className="task-meta">
            {task.reminderTime && (
              <span className="task-reminder" title="Reminder">
                <Icon name="bell" size={12} />
                {formatClock(task.reminderTime)}
              </span>
            )}
            {task.note && (
              <span className="task-note-preview">
                <Icon name="note" size={13} />
                <span className="task-note-text">
                  <LinkifiedText text={firstLine(task.note)} />
                </span>
              </span>
            )}
            {tags.map((tag) => (
              <TagChip key={tag.id} name={tag.name} color={tag.color} size="sm" />
            ))}
          </span>
        )}
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
          onCancel={onCancel}
        />
      </div>
    </div>
  )
}

/** The note's first line; CSS trims it to fit (never cutting a link's address). */
function firstLine(note: string): string {
  return note.split('\n')[0].trim()
}
