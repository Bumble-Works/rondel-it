import type { QueryClient } from '@tanstack/react-query'
import type { Task, TaskStatus } from '../../domain/types'
import type { CreateTaskInput, DataSource, MoveOptions } from '../../services/adapters/DataSource'
import { localDataSource as source } from '../../services/adapters/localDataSource'
import { cancelTaskReads, patchTaskCaches, pendingTaskEdit, type TaskFields } from '../../services/queries/taskCache'
import type { MutationServices } from '../app/useAppMutation'

export type TaskAction =
  | { type: 'create'; input: CreateTaskInput }
  | { type: 'advance'; id: string }
  | { type: 'status'; id: string; status: TaskStatus; options?: { onItsDay?: boolean } }
  | { type: 'update'; id: string; input: Parameters<DataSource['updateTask']>[1] }
  | { type: 'move'; id: string; target: Parameters<DataSource['moveTask']>[1]; options?: MoveOptions }
  | { type: 'flag'; id: string }
  | { type: 'tags'; id: string; change: (ids: string[]) => string[] }
  | { type: 'createTag'; id: string; name: string }
  | { type: 'reminder'; id: string; time: string | null; scope: 'one' | 'all' }
  | { type: 'copy'; id: string; day: string }

function fieldsFrom(task: Task, fields: TaskFields): TaskFields {
  return {
    ...('title' in fields && { title: task.title }),
    ...('note' in fields && { note: task.note }),
    ...('flagged' in fields && { flagged: task.flagged }),
    ...('tagIds' in fields && { tagIds: task.tagIds }),
    ...('reminderTime' in fields && { reminderTime: task.reminderTime }),
  }
}

function editedFields(action: TaskAction, before: Task | null): TaskFields | null {
  if (!before) return null
  if (action.type === 'flag') return { flagged: !before.flagged }
  if (action.type === 'tags') return { tagIds: action.change(before.tagIds) }
  if (action.type === 'reminder' && (action.scope === 'one' || !before.recurringRuleId)) return { reminderTime: action.time }
  if (action.type !== 'update') return null
  return { ...action.input, ...(action.input.title !== undefined && { title: action.input.title.trim() || before.title }) }
}

async function write(action: TaskAction, before: Task | null): Promise<Task> {
  if (action.type === 'create') return source.createTask(action.input)
  if (!before) throw new Error('Task not found')
  switch (action.type) {
    case 'advance': return source.advanceTask(action.id)
    case 'status': return source.setTaskStatus(action.id, action.status, action.options)
    case 'update': return source.updateTask(action.id, action.input)
    case 'flag': return source.updateTask(action.id, { flagged: !before.flagged })
    case 'move': {
      const keepsPeriod = !action.options?.rondel && action.target.rondeled && before.rondeled && before.dayDate !== null
      const target = keepsPeriod ? { ...action.target, dayDate: before.dayDate } : action.target
      return source.moveTask(action.id, target, action.options)
    }
    case 'tags': return source.updateTask(action.id, { tagIds: action.change(before.tagIds) })
    case 'createTag': {
      const tag = await source.createTag({ name: action.name })
      return source.updateTask(action.id, { tagIds: before.tagIds.includes(tag.id) ? before.tagIds : [...before.tagIds, tag.id] })
    }
    case 'reminder':
      if (action.scope === 'all' && before.recurringRuleId) {
        await source.updateRecurringRule(before.recurringRuleId, { reminderTime: action.time }, { applyToOpenTasks: true })
        return source.getTask(action.id)
      }
      return source.updateTask(action.id, { reminderTime: action.time })
    case 'copy': {
      const copy = await source.createTask({ title: before.title, dayDate: action.day, tagIds: before.tagIds })
      return before.note || before.flagged ? source.updateTask(copy.id, { note: before.note, flagged: before.flagged }) : copy
    }
  }
}

export async function executeTaskAction(client: QueryClient, action: TaskAction, services: MutationServices): Promise<Task> {
  const before = 'id' in action ? await source.getTask(action.id) : null
  const fields = editedFields(action, before)
  const optimistic = fields && (action.type === 'flag' || (action.type === 'update' &&
    Object.keys(fields).every((key) => ['title', 'note', 'flagged'].includes(key))))
  const finishOptimism = optimistic && before ? pendingTaskEdit(client, before.id, fields) : () => {}
  if (optimistic && before) patchTaskCaches(client, before.id, fields)
  let resumeReads = () => {}
  try {
    let saved: Task
    try {
      saved = await write(action, before)
    } catch (error) {
      resumeReads = await cancelTaskReads(client)
      finishOptimism()
      if (fields && before) {
        try {
          // Read the durable record so rollback also respects changes received through sync.
          const current = await source.getTask(before.id)
          patchTaskCaches(client, before.id, fieldsFrom(current, fields), current)
        } catch (recoveryError) {
          patchTaskCaches(client, before.id, fieldsFrom(before, fields), before)
          services.reportError('Unable to reload task after a failed save', recoveryError)
          await services.refresh()
        }
      } else if (action.type === 'copy' || action.type === 'createTag' || action.type === 'reminder') {
        await services.refresh({ metadata: action.type !== 'copy' })
      }
      throw error
    }
    resumeReads = await cancelTaskReads(client)
    finishOptimism()
    services.clearError?.()
    if (fields) patchTaskCaches(client, saved.id, fieldsFrom(saved, fields), saved)
    else await services.refresh({
      metadata: action.type === 'createTag' || action.type === 'reminder',
      recurring: (action.type === 'advance' || action.type === 'status') && Boolean(saved.recurringRuleId),
    })
    services.scheduleSync()
    return saved
  } finally {
    finishOptimism()
    resumeReads()
  }
}
