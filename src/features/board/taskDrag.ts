import type { DragEvent } from 'react'

// Set at drag start, so drops never wait on React state or the drag's data,
// neither of which the Mac app's web view delivers in time.
let draggedId: string | null = null

export function startTaskDrag(e: DragEvent<HTMLElement>, task: { id: string; title: string }): void {
  draggedId = task.id
  e.dataTransfer.effectAllowed = 'move'
  // WebKit won't start a drag without data.
  e.dataTransfer.setData('text/plain', task.title)
}

export function endTaskDrag(): void {
  draggedId = null
}

/** On drag-over: accepts a dragged task, as a move (not WebKit's default copy). */
export function acceptTaskDrop(e: DragEvent<HTMLElement>): boolean {
  if (!draggedId) return false
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  return true
}

/** On drop: the dragged task, used up (a task moved elsewhere may never get its drag end). */
export function droppedTaskId(): string | null {
  const id = draggedId
  draggedId = null
  return id
}
