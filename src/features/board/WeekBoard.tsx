import { useState } from 'react'
import type { RondelTarget } from '../../services/adapters/DataSource'
import { formatDayLabel } from '../../domain/dates'
import type { Tag, Task, TaskBucket } from '../../domain/types'
import { IconButton } from '../../shared/ui/IconButton'
import { BoardSection } from './BoardSection'
import { InlineAdd } from './InlineAdd'
import { TaskRow } from './TaskRow'
import './WeekBoard.css'

export interface BoardGroupAddTarget {
  dayDate?: string
  rondeled?: boolean
  bucket?: TaskBucket
}

export interface BoardGroup {
  key: string
  kind: 'day' | 'bucket'
  title: string
  eyebrow?: string
  highlight?: boolean
  defaultCollapsed?: boolean
  collapsible?: boolean
  addTarget?: BoardGroupAddTarget
  emptyLabel?: string
  tasks: Task[]
  /** Week/month day sections can be printed on their own (as filtered). */
  onPrint?: () => void
  /** The page header already shows this title (it's the only section of its kind). */
  hideTitle?: boolean
}

interface WeekBoardProps {
  groups: BoardGroup[]
  tagsById: Map<string, Tag>
  selectedTaskId: string | null
  onOpen: (task: Task) => void
  onAdvance: (task: Task) => void
  onSetDone: (task: Task) => void
  onRondel: (task: Task, target: RondelTarget) => void
  onPickDate: (task: Task) => void
  onOpenNote: (task: Task) => void
  onToggleFlag: (task: Task) => void
  onDelete: (task: Task) => void
  onCopy: (task: Task, dayIso: string) => void
  onPickCopyDate: (task: Task) => void
  onOpenReminder: (task: Task) => void
  onQuickAdd: (target: BoardGroupAddTarget, title: string, tagIds: string[]) => void
  onCreateTag: (name: string) => Promise<Tag | null>
  onMove: (taskId: string, target: BoardGroupAddTarget, beforeId: string | null) => void
  weekStartDay?: number
}

export function WeekBoard({
  groups,
  tagsById,
  selectedTaskId,
  onOpen,
  onAdvance,
  onSetDone,
  onRondel,
  onPickDate,
  onOpenNote,
  onToggleFlag,
  onDelete,
  onCopy,
  onPickCopyDate,
  onOpenReminder,
  onQuickAdd,
  onCreateTag,
  onMove,
  weekStartDay,
}: WeekBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const tags = [...tagsById.values()]
  const isDragging = Boolean(draggingId)

  const beforeIdForDrop = (
    taskIds: string[],
    dragId: string,
    dropIndex: number,
    position: 'before' | 'after',
  ): string | null => {
    const sourceIndex = taskIds.indexOf(dragId)
    const baseIndex = position === 'before' ? dropIndex : dropIndex + 1
    let insertAt = baseIndex

    if (sourceIndex !== -1 && sourceIndex < baseIndex) {
      insertAt -= 1
    }

    const remaining = taskIds.filter((id) => id !== dragId)
    return remaining[insertAt] ?? null
  }

  return (
    <div className={`week-board ${isDragging ? 'is-dragging' : ''}`.trim()}>
      {groups.map((group) => (
        <BoardSection
          key={group.key}
          title={group.title}
          eyebrow={group.eyebrow}
          count={group.tasks.length}
          highlight={group.highlight}
          tone={group.kind}
          defaultCollapsed={group.defaultCollapsed}
          collapsible={group.collapsible}
          hideTitle={group.hideTitle}
          headerRight={
            group.onPrint && (
              <IconButton
                icon="print"
                label={`Print ${group.title}`}
                title={`Print ${formatDayLabel(group.key)}`}
                className="board-section-print"
                size={17}
                onClick={group.onPrint}
              />
            )
          }
          empty={group.tasks.length === 0 && !group.addTarget}
          emptyLabel={group.emptyLabel}
          onDropAtEnd={
            group.addTarget
              ? () => {
                  if (draggingId) onMove(draggingId, group.addTarget as BoardGroupAddTarget, null)
                }
              : undefined
          }
        >
          {group.tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              tagsById={tagsById}
              selected={task.id === selectedTaskId}
              onOpen={() => onOpen(task)}
              onAdvance={() => onAdvance(task)}
              onSetDone={() => onSetDone(task)}
              onRondel={(target) => onRondel(task, target)}
              onPickDate={() => onPickDate(task)}
              onOpenNote={() => onOpenNote(task)}
              onToggleFlag={() => onToggleFlag(task)}
              onDelete={() => onDelete(task)}
              onCopy={(dayIso) => onCopy(task, dayIso)}
              onPickCopyDate={() => onPickCopyDate(task)}
              onOpenReminder={() => onOpenReminder(task)}
              dragging={Boolean(draggingId)}
              isDragged={draggingId === task.id}
              onDragStartTask={() => setDraggingId(task.id)}
              onDragEndTask={() => setDraggingId(null)}
              onDropOnRow={(position) => {
                if (!draggingId || !group.addTarget) return
                const beforeId = beforeIdForDrop(
                  group.tasks.map((t) => t.id),
                  draggingId,
                  index,
                  position,
                )
                onMove(draggingId, group.addTarget, beforeId)
              }}
              weekStartDay={weekStartDay}
            />
          ))}
          {group.addTarget && (
            <InlineAdd
              placeholder={group.kind === 'bucket' ? 'Add to this bucket' : 'Add a task'}
              tags={tags}
              onCreateTag={onCreateTag}
              onAdd={(title, tagIds) => onQuickAdd(group.addTarget as BoardGroupAddTarget, title, tagIds)}
            />
          )}
        </BoardSection>
      ))}
    </div>
  )
}
