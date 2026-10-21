import type { BoardGroup, BoardGroupAddTarget } from './WeekBoard'

/** Drop targets: a task row (drop before/after it), or a section's empty space (drop last). */
export const rowDropId = (taskId: string) => `row:${taskId}`
export const sectionDropId = (groupKey: string) => `section:${groupKey}`
export const isRowDropId = (id: string) => id.startsWith('row:')

export type DropPosition = 'before' | 'after'

/** Where a dropped task goes: which section, and the task it lands in front of (null: last). */
export interface DropSpot {
  target: BoardGroupAddTarget
  beforeId: string | null
}

/** The task the dragged one lands in front of, once it's out of the list. */
export function beforeIdForDrop(taskIds: string[], dragId: string, dropIndex: number, position: DropPosition): string | null {
  const sourceIndex = taskIds.indexOf(dragId)
  let insertAt = position === 'before' ? dropIndex : dropIndex + 1
  if (sourceIndex !== -1 && sourceIndex < insertAt) insertAt -= 1
  return taskIds.filter((id) => id !== dragId)[insertAt] ?? null
}

/** Where a drop on `overId` puts the dragged task, or null if it goes nowhere. */
export function dropSpot(groups: BoardGroup[], dragId: string, overId: string, position: DropPosition): DropSpot | null {
  if (isRowDropId(overId)) {
    const rowId = overId.slice('row:'.length)
    if (rowId === dragId) return null
    const group = groups.find((g) => g.tasks.some((t) => t.id === rowId))
    if (!group?.addTarget) return null
    const taskIds = group.tasks.map((t) => t.id)
    return { target: group.addTarget, beforeId: beforeIdForDrop(taskIds, dragId, taskIds.indexOf(rowId), position) }
  }
  const group = groups.find((g) => sectionDropId(g.key) === overId)
  return group?.addTarget ? { target: group.addTarget, beforeId: null } : null
}
