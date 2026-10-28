import { useRef } from 'react'
import type { Task, TaskStatus } from '../../domain/types'
import type { CreateTaskInput, DataSource, MoveOptions, RondelTarget } from '../../services/adapters/DataSource'
import { localDataSource as source } from '../../services/adapters/localDataSource'
import { useAppMutation, type MutationServices } from '../app/useAppMutation'
import type { BoardGroupAddTarget } from '../board/WeekBoard'

type TaskAction =
  | { type: 'create'; input: CreateTaskInput }
  | { type: 'advance'; id: string }
  | { type: 'status'; id: string; status: TaskStatus; options?: { onItsDay?: boolean } }
  | { type: 'update'; id: string; input: Parameters<DataSource['updateTask']>[1] }
  | { type: 'move'; id: string; target: Parameters<DataSource['moveTask']>[1]; options?: MoveOptions }
  | { type: 'tags'; id: string; change: (ids: string[]) => string[] }
  | { type: 'createTag'; id: string; name: string }
  | { type: 'reminder'; task: Task; time: string | null; scope: 'one' | 'all' }
  | { type: 'copy'; task: Task; day: string }

export function useTaskActions(services: MutationServices) {
  const tagQueue = useRef<Promise<unknown>>(Promise.resolve())
  const changeTags = (id: string, change: (ids: string[]) => string[]) => {
    const job = tagQueue.current.then(async () => {
      const task = await source.getTask(id)
      return source.updateTask(id, { tagIds: change(task.tagIds) })
    })
    // Each rejected job is reported by the mutation; subsequent picks must still run.
    tagQueue.current = job.catch(() => {})
    return job
  }

  const execute = async (action: TaskAction): Promise<Task> => {
    switch (action.type) {
      case 'create': return source.createTask(action.input)
      case 'advance': return source.advanceTask(action.id)
      case 'status': return source.setTaskStatus(action.id, action.status, action.options)
      case 'update': return source.updateTask(action.id, action.input)
      case 'move': return source.moveTask(action.id, action.target, action.options)
      case 'tags': return changeTags(action.id, action.change)
      case 'createTag': {
        const tag = await source.createTag({ name: action.name })
        return changeTags(action.id, (ids) => ids.includes(tag.id) ? ids : [...ids, tag.id])
      }
      case 'reminder':
        if (action.scope === 'all' && action.task.recurringRuleId) {
          await source.updateRecurringRule(action.task.recurringRuleId, { reminderTime: action.time }, { applyToOpenTasks: true })
          return source.getTask(action.task.id)
        }
        return source.updateTask(action.task.id, { reminderTime: action.time })
      case 'copy': {
        const { task, day } = action
        const copy = await source.createTask({ title: task.title, dayDate: day, tagIds: task.tagIds })
        return task.note || task.flagged ? source.updateTask(copy.id, { note: task.note, flagged: task.flagged }) : copy
      }
    }
  }
  const run = useAppMutation(execute, 'Something went wrong', services,
    (action) => action.type === 'createTag' || (action.type === 'reminder' && action.scope === 'all'))

  return {
    createTask: (input: CreateTaskInput) => run({ type: 'create', input }),
    advance: (task: Task) => run({ type: 'advance', id: task.id }),
    setDone: (task: Task, options?: { onItsDay?: boolean }) => run({ type: 'status', id: task.id, status: 'done', options }),
    cancel: (id: string) => run({ type: 'status', id, status: 'canceled' }),
    update: (id: string, input: Parameters<DataSource['updateTask']>[1]) => run({ type: 'update', id, input }),
    rondel: (task: Task, target: RondelTarget) => run({
      type: 'move', id: task.id,
      target: { dayDate: target.toDate ?? null, rondeled: target.rondeled ?? false, bucket: target.toBucket ?? null },
      options: { rondel: true },
    }),
    move: (task: Task, target: BoardGroupAddTarget, beforeId: string | null) => run({
      type: 'move', id: task.id,
      // Reordering within a container preserves its original waiting period.
      target: target.rondeled && task.rondeled && task.dayDate ? { ...target, dayDate: task.dayDate } : target,
      options: { beforeId },
    }),
    toggleFlag: (task: Task) => run({ type: 'update', id: task.id, input: { flagged: !task.flagged } }),
    addTag: (task: Task, tagId: string) => run({ type: 'tags', id: task.id, change: (ids) => ids.includes(tagId) ? ids : [...ids, tagId] }),
    toggleTag: (task: Task, tagId: string) => run({ type: 'tags', id: task.id, change: (ids) => ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId] }),
    createTagForTask: (task: Task, name: string) => run({ type: 'createTag', id: task.id, name }),
    changeReminder: (task: Task, time: string | null, scope: 'one' | 'all') => run({ type: 'reminder', task, time, scope }),
    copyTask: (task: Task, day: string) => run({ type: 'copy', task, day }),
  }
}
