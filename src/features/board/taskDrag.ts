import type { DragEvent } from 'react'

/**
 * The task being dragged, kept in a plain variable from the moment the drag
 * starts. Drops read it here rather than from React state (WebKit can deliver
 * a drop before that state renders) or from the drag's data (the Mac app's
 * web view doesn't pass custom drag types through), either of which left
 * the drop doing nothing.
 */
let draggedId: string | null = null

export function startTaskDrag(e: DragEvent<HTMLElement>, task: { id: string; title: string }): void {
  draggedId = task.id
  e.dataTransfer.effectAllowed = 'move'
  // WebKit needs some data to start a drag; the title is what other apps get.
  e.dataTransfer.setData('text/plain', task.title)
}

/** On drag end (dropped or not). */
export function endTaskDrag(): void {
  draggedId = null
}

/**
 * On drag-over: accepts a dragged task here, as a move. Returns whether it did.
 * Saying "move" keeps WebKit from picking "copy" (the green plus cursor),
 * which a move-only drag would then refuse.
 */
export function acceptTaskDrop(e: DragEvent<HTMLElement>): boolean {
  if (!draggedId) return false
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  return true
}

/**
 * On drop: the dragged task's id, or null if this isn't a task drag. It's
 * used up, since a task moved to another section may never get its drag end.
 */
export function droppedTaskId(): string | null {
  const id = draggedId
  draggedId = null
  return id
}
