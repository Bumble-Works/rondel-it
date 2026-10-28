import { queryOptions } from '@tanstack/react-query'
import { isWaitingForDecision, showsInRondelContainer } from '../../domain/rondel'
import type { DataSource } from '../adapters/DataSource'
import type { Task } from '../../domain/types'
import { appKeys } from './queryClient'
import { applyPendingTaskEdits } from './taskCache'

export function appDataOptions(source: DataSource) {
  return queryOptions({
    queryKey: appKeys.metadata,
    queryFn: async ({ signal }) => {
      try {
        const [tags, settings, rules] = await Promise.all([
          source.listTags(), source.getSettings(), source.listRecurringRules(),
        ])
        return { tags, settings, rules }
      } catch (error) {
        if (signal.aborted) console.error('[rondel] Superseded app-data load failed', error)
        throw error
      }
    },
  })
}

export interface BoardRange {
  rangeStart: string
  rangeEnd: string
  containerStart: string
  containerEnd: string
  today: string
}

export interface BoardData {
  rangeTasks: Task[]
  bucketTasks: Task[]
  reminderTasks: Task[]
  leftUndone: Task[]
  containerItems: Task[]
  undecided: Task[]
  today: string
}

export function boardOptions(source: DataSource, range: BoardRange) {
  const { rangeStart, rangeEnd, containerStart, containerEnd, today } = range
  return queryOptions({
    queryKey: [...appKeys.boards, range],
    queryFn: async ({ signal, client }): Promise<BoardData> => {
      try {
        const [rangeTasks, bucketTasks, rondelItems, reminderTasks, leftUndone] = await Promise.all([
          source.listTasksInRange(rangeStart, rangeEnd),
          source.listBucketTasks('bucket-list'),
          source.listRondelItems(),
          source.listUpcomingReminders(today),
          source.listLeftUndone(today),
        ])
        return {
          rangeTasks: applyPendingTaskEdits(client, rangeTasks),
          bucketTasks: applyPendingTaskEdits(client, bucketTasks),
          reminderTasks: applyPendingTaskEdits(client, reminderTasks),
          leftUndone: applyPendingTaskEdits(client, leftUndone), today,
          containerItems: applyPendingTaskEdits(client, rondelItems.filter((task) => showsInRondelContainer(task, { start: containerStart, end: containerEnd }, today))),
          undecided: applyPendingTaskEdits(client, rondelItems.filter((task) => isWaitingForDecision(task, today))),
        }
      } catch (error) {
        if (signal.aborted) console.error('[rondel] Superseded task load failed', error)
        throw error
      }
    },
  })
}
