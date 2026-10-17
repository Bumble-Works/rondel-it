import { useRef, useState, type DragEvent } from 'react'
import type { RondelTarget } from '../../services/adapters/DataSource'
import { CARRIED_FORWARD_HINT, canRondel, isCarriedForward } from '../../domain/rondel'
import type { Tag, Task } from '../../domain/types'
import { Icon } from '../../shared/ui/Icon'
import { StatusCircle } from '../../shared/ui/StatusCircle'
import { TagChip } from '../../shared/ui/TagChip'
import { RondelMenu } from '../rondel/RondelMenu'
import { OPEN_IN_PANEL_HINT } from '../task/hints'
import './TaskRow.css'

interface TaskRowProps {
  task: Task
  tagsById: Map<string, Tag>
  selected: boolean
  onOpen: () => void
  onAdvance: () => void
  onSetDone: () => void
  onRondel: (target: RondelTarget) => void
  onPickDate: () => void
  onOpenNote: () => void
  onDelete: () => void
  dragging: boolean
  isDragged: boolean
  onDragStartTask: () => void
  onDragEndTask: () => void
  onDropOnRow: (position: 'before' | 'after') => void
  weekStartDay?: number
}

export function TaskRow({
  task,
  tagsById,
  selected,
  onOpen,
  onAdvance,
  onSetDone,
  onRondel,
  onPickDate,
  onOpenNote,
  onDelete,
  dragging,
  isDragged,
  onDragStartTask,
  onDragEndTask,
  onDropOnRow,
  weekStartDay,
}: TaskRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null)
  const tags = task.tagIds.map((id) => tagsById.get(id)).filter((t): t is Tag => Boolean(t))
  const canDrop = dragging && !isDragged
  const carried = isCarriedForward(task)
  // While a task is open in the detail panel, the panel is its only editor.
  const locked = selected

  const startDrag = (e: DragEvent<HTMLElement>) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
    if (rowRef.current) e.dataTransfer.setDragImage(rowRef.current, 16, 16)
    // Defer the state update: mutating the dragged node's render synchronously
    // in onDragStart causes Chrome to abort the drag before it begins.
    requestAnimationFrame(() => onDragStartTask())
  }

  const endDrag = () => onDragEndTask()

  const calcDropPosition = (clientY: number): 'before' | 'after' => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (!rect) return 'before'
    return clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  }

  return (
    <div
      ref={rowRef}
      className={[
        'task-row',
        selected ? 'is-selected' : '',
        task.status === 'done' ? 'is-done' : '',
        task.status === 'canceled' ? 'is-canceled' : '',
        carried ? 'is-carried' : '',
        isDragged ? 'is-dragged' : '',
        dropPosition === 'before' ? 'is-drop-before' : '',
        dropPosition === 'after' ? 'is-drop-after' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={
        canDrop
          ? (e) => {
              e.preventDefault()
            setDropPosition(calcDropPosition(e.clientY))
            }
          : undefined
      }
      onDragLeave={canDrop ? () => setDropPosition(null) : undefined}
      onDrop={(e) => {
        if (!dragging) return
        e.preventDefault()
        // Swallow drops on the dragged row itself, so they don't bubble up to
        // the section's "drop at end" and move the task to the bottom.
        e.stopPropagation()
        if (!canDrop) return
        const position = calcDropPosition(e.clientY)
        setDropPosition(null)
        onDropOnRow(position)
      }}
    >
      {task.status === 'done' || carried || locked ? (
        <span className="task-grip task-grip--empty" aria-hidden="true" />
      ) : (
        <span
          className="task-grip"
          draggable
          aria-label="Drag to move or reorder"
          title="Drag to move or reorder"
          onDragStart={startDrag}
          onDragEnd={endDrag}
        >
          <Icon name="grip" size={16} />
        </span>
      )}

      <StatusCircle
        status={task.status}
        onClick={onAdvance}
        onDoubleClick={onSetDone}
        disabled={locked || carried || !task.dayDate}
        disabledTitle={locked ? OPEN_IN_PANEL_HINT : carried ? CARRIED_FORWARD_HINT : undefined}
      />

      <button
        type="button"
        className="task-main"
        title={carried ? CARRIED_FORWARD_HINT : undefined}
        onClick={onOpen}
      >
        <span className="task-title">
          {task.recurringRuleId && (
            <span className="task-recur" title="Recurring task">
              <Icon name="repeat" size={13} />
            </span>
          )}
          {task.title}
        </span>
        {(tags.length > 0 || task.note) && (
          <span className="task-meta">
            {task.note && (
              <span className="task-note-preview">
                <Icon name="note" size={13} />
                {firstLine(task.note)}
              </span>
            )}
            {tags.map((tag) => (
              <TagChip key={tag.id} name={tag.name} color={tag.color} size="sm" />
            ))}
          </span>
        )}
      </button>

      <div className="task-actions">
        <button
          type="button"
          className={`task-note-btn ${task.note ? 'has-note' : ''}`.trim()}
          aria-label={task.note ? 'Edit note' : 'Add note'}
          title={locked ? OPEN_IN_PANEL_HINT : task.note ? 'Edit note' : 'Add note'}
          disabled={locked}
          onClick={onOpenNote}
        >
          <Icon name={task.note ? 'note-filled' : 'note'} size={18} />
        </button>
        <button
          type="button"
          className="task-delete-btn"
          aria-label="Delete task"
          title={locked ? OPEN_IN_PANEL_HINT : 'Delete task'}
          disabled={locked}
          onClick={onDelete}
        >
          <Icon name="trash" size={17} />
        </button>
        {canRondel(task) && (
          <RondelMenu onRondel={onRondel} onPickDate={onPickDate} weekStartDay={weekStartDay} disabled={locked} />
        )}
      </div>
    </div>
  )
}

function firstLine(note: string): string {
  const line = note.split('\n')[0].trim()
  return line.length > 60 ? `${line.slice(0, 60)}…` : line
}
