import type { DragEvent } from 'react'

/**
 * Dragging a task carries its id in the drag itself, so drops never depend on
 * React state set after the drag started: WebKit (the Mac app) can deliver a
 * drop before that state has rendered, and the drop would do nothing.
 */
const TASK_DRAG_TYPE = 'application/x-rondel-task'

export function startTaskDrag(e: DragEvent<HTMLElement>, taskId: string): void {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData(TASK_DRAG_TYPE, taskId)
}

/**
 * On drag-over: accepts a dragged task here, as a move. Returns whether it did.
 * Saying "move" keeps WebKit from picking "copy" (the green plus cursor),
 * which a move-only drag would then refuse.
 */
export function acceptTaskDrop(e: DragEvent<HTMLElement>): boolean {
  if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return false
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  return true
}

/** On drop: the dragged task's id, or null if this isn't a task drag. */
export function droppedTaskId(e: DragEvent<HTMLElement>): string | null {
  return e.dataTransfer.getData(TASK_DRAG_TYPE) || null
}
