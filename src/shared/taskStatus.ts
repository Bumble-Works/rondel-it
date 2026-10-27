import type { TaskStatus } from '../domain/types'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
  canceled: 'Canceled',
}

export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: 'var(--muted)',
  doing: 'var(--status-doing)',
  done: 'var(--status-done)',
  canceled: 'var(--faint)',
}
export const FILTERABLE_STATUSES: TaskStatus[] = ['todo', 'doing', 'done', 'canceled']

export function toggleStatusFilter(selected: TaskStatus[], status: TaskStatus): TaskStatus[] {
  const next = selected.includes(status) ? selected.filter((item) => item !== status) : [...selected, status]
  return next.length === FILTERABLE_STATUSES.length ? [] : next
}
