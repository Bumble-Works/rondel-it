import type { QueryClient } from '@tanstack/react-query'
import { isUpcomingReminder } from '../../domain/rondel'
import type { Task } from '../../domain/types'
import type { BoardData } from './appQueries'
import { appKeys } from './queryClient'

export type TaskFields = Partial<Pick<Task, 'title' | 'note' | 'flagged' | 'tagIds' | 'reminderTime'>>
const pending = new WeakMap<QueryClient, Map<string, TaskFields>>()

export function pendingTaskEdit(client: QueryClient, id: string, fields: TaskFields) {
  let edits = pending.get(client)
  if (!edits) { edits = new Map(); pending.set(client, edits) }
  edits.set(id, fields)
  return () => { edits.delete(id) }
}

export function applyPendingTaskEdits(client: QueryClient, tasks: Task[]): Task[] {
  const edits = pending.get(client)
  if (!edits?.size) return tasks
  return tasks.map((task) => {
    const fields = edits.get(task.id)
    return fields ? { ...task, ...fields } : task
  })
}

function patchTasks(tasks: Task[], id: string, fields: TaskFields): Task[] {
  let changed = false
  const result = tasks.map((task) => {
    if (task.id !== id || Object.entries(fields).every(([key, value]) => task[key as keyof Task] === value)) return task
    changed = true
    return { ...task, ...fields }
  })
  return changed ? result : tasks
}

/** Update each cached occurrence while retaining unrelated edits and query invalidations. */
export function patchTaskCaches(client: QueryClient, id: string, fields: TaskFields, saved?: Task) {
  for (const query of client.getQueryCache().findAll({ queryKey: appKeys.tasks })) {
    const current = query.state.data
    if (!current) continue
    let updated: Task[] | BoardData
    if (query.queryKey[1] === 'reports') {
      updated = patchTasks(current as Task[], id, fields)
    } else if (query.queryKey[1] === 'board') {
      const board = current as BoardData
      const next = { ...board }
      for (const key of ['rangeTasks', 'bucketTasks', 'reminderTasks', 'leftUndone', 'containerItems', 'undecided'] as const) {
        next[key] = patchTasks(board[key], id, fields)
      }
      if ('reminderTime' in fields && saved) {
        const reminder = { ...saved, ...fields }
        if (!isUpcomingReminder(reminder, board.today)) next.reminderTasks = next.reminderTasks.filter((task) => task.id !== id)
        else if (!next.reminderTasks.some((task) => task.id === id)) next.reminderTasks = [...next.reminderTasks, reminder]
      }
      updated = Object.keys(board).every((key) => board[key as keyof BoardData] === next[key as keyof BoardData]) ? board : next
    } else continue
    if (updated === current) continue
    const invalidated = query.state.isInvalidated
    client.setQueryData(query.queryKey, updated, { updatedAt: query.state.dataUpdatedAt })
    if (invalidated) query.invalidate()
  }
}

/** A read begun before a write settled must not restore the old fields afterwards. */
export async function cancelTaskReads(client: QueryClient) {
  const reads = client.getQueryCache().findAll({ queryKey: appKeys.tasks })
    .filter((query) => query.state.fetchStatus === 'fetching' || query.state.status === 'error')
  await client.cancelQueries({ queryKey: appKeys.tasks, fetchStatus: 'fetching' })
  return () => {
    for (const query of reads) {
      void client.refetchQueries({ queryKey: query.queryKey, exact: true, type: 'active' }, { cancelRefetch: false })
    }
  }
}
