import type { ReportFilters } from './reportTypes'
import type { Task } from './types'

export interface ReportLineage {
  id: string
  tasks: Task[]
  current: Task | null
}

export function rondelGroupId(task: Task): string {
  return task.originTaskId ?? task.id
}

export function groupLineage(tasks: Task[]): ReportLineage[] {
  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    const id = rondelGroupId(task)
    const group = groups.get(id) ?? []
    group.push(task)
    groups.set(id, group)
  }
  return [...groups].map(([id, members]) => {
    const ordered = [...members].sort((a, b) =>
      a.rondelCount - b.rondelCount || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    return { id, tasks: ordered, current: ordered.filter((task) => !task.carriedToId).at(-1) ?? null }
  })
}

export function matchesReportTags(task: Task, filters: ReportFilters): boolean {
  const selected = filters.tagIds ?? []
  if (!selected.length) return true
  return filters.tagMatch === 'all'
    ? selected.every((id) => task.tagIds.includes(id))
    : selected.some((id) => task.tagIds.includes(id))
}
