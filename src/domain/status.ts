import type { TaskStatus } from './types'

/** Where one click on a task's status moves it: to-do → doing → done → to-do. */
export function nextStatus(status: TaskStatus): TaskStatus {
  if (status === 'todo') return 'doing'
  if (status === 'doing') return 'done'
  return 'todo'
}

/** The action that click is named for, e.g. "Mark as doing". */
export const NEXT_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Mark as doing',
  doing: 'Mark as done',
  done: 'Mark as to-do',
  canceled: 'Mark as to-do',
}
