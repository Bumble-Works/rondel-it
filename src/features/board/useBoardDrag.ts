import {
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import { dropSpot, isRowDropId, rowDropId, type DropPosition } from './boardDrop'
import type { BoardGroup, BoardGroupAddTarget } from './WeekBoard'

// A row under the pointer wins over the section around it.
const rowsFirst: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  const rows = hits.filter((hit) => isRowDropId(String(hit.id)))
  return rows.length ? rows : hits
}

/** Before or after the row under the pointer: whichever half it's over. */
function positionOver({ over, activatorEvent, delta }: DragMoveEvent): DropPosition {
  if (!over) return 'after'
  const startY = activatorEvent instanceof PointerEvent ? activatorEvent.clientY : over.rect.top
  return startY + delta.y < over.rect.top + over.rect.height / 2 ? 'before' : 'after'
}

/**
 * Dragging tasks with pointer events (mouse, pen, touch) via dnd-kit, not the
 * browser's built-in drag and drop, which the Mac app's web view doesn't
 * deliver reliably and Android's doesn't support for touch.
 */
export function useBoardDrag(
  groups: BoardGroup[],
  onMove: (taskId: string, target: BoardGroupAddTarget, beforeId: string | null) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{ overId: string; position: DropPosition } | null>(null)
  // A few pixels of movement first, so a click on the grip isn't a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const reset = () => {
    setDraggingId(null)
    setDropHint(null)
  }

  return {
    draggingId,
    /** The drop line to show on a row: before or after it, or none. */
    dropPositionFor: (rowDropId: string) => (dropHint?.overId === rowDropId ? dropHint.position : null),
    dndContext: {
      sensors,
      collisionDetection: rowsFirst,
      onDragStart: ({ active }: DragStartEvent) => setDraggingId(String(active.id)),
      onDragMove: (event: DragMoveEvent) => {
        const overId = event.over ? String(event.over.id) : null
        const position = positionOver(event)
        const onItself = overId === rowDropId(String(event.active.id))
        const hint = overId && isRowDropId(overId) && !onItself ? { overId, position } : null
        // Only re-render when the line actually moves.
        if (hint?.overId !== dropHint?.overId || hint?.position !== dropHint?.position) setDropHint(hint)
      },
      onDragEnd: (event: DragEndEvent) => {
        reset()
        if (!event.over) return
        const spot = dropSpot(groups, String(event.active.id), String(event.over.id), positionOver(event))
        if (spot) onMove(String(event.active.id), spot.target, spot.beforeId)
      },
      onDragCancel: reset,
    },
  }
}
