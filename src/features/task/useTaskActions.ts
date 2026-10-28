import { MutationObserver, useQueryClient } from '@tanstack/react-query'
import type { Task } from '../../domain/types'
import type { CreateTaskInput, DataSource, RondelTarget } from '../../services/adapters/DataSource'
import type { MutationServices } from '../app/useAppMutation'
import type { BoardGroupAddTarget } from '../board/WeekBoard'
import { executeTaskAction, type TaskAction } from './taskMutation'

export function useTaskActions(services: MutationServices) {
  const client = useQueryClient()
  const run = async (action: TaskAction): Promise<Task | null> => {
    // Each dispatch needs its task's scope; a shared useMutation would give every row one scope.
    const observer = new MutationObserver(client, {
      mutationKey: ['task-action'],
      scope: 'id' in action ? { id: `task:${action.id}` } : undefined,
      mutationFn: (input: TaskAction) => executeTaskAction(client, input, services),
      onError: (error) => services.reportError('Something went wrong', error),
    })
    try {
      return await observer.mutate(action)
    } catch {
      // The mutation reports the failure; event handlers can safely ignore the result.
      return null
    } finally {
      observer.reset()
    }
  }

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
      target,
      options: { beforeId },
    }),
    toggleFlag: (task: Task) => run({ type: 'flag', id: task.id }),
    addTag: (task: Task, tagId: string) => run({ type: 'tags', id: task.id, change: (ids) => ids.includes(tagId) ? ids : [...ids, tagId] }),
    toggleTag: (task: Task, tagId: string) => run({ type: 'tags', id: task.id, change: (ids) => ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId] }),
    createTagForTask: (task: Task, name: string) => run({ type: 'createTag', id: task.id, name }),
    changeReminder: (task: Task, time: string | null, scope: 'one' | 'all') => run({ type: 'reminder', id: task.id, time, scope }),
    copyTask: (task: Task, day: string) => run({ type: 'copy', id: task.id, day }),
  }
}
