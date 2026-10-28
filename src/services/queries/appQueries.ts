import { queryOptions } from '@tanstack/react-query'
import { isWaitingForDecision, showsInRondelContainer } from '../../domain/rondel'
import type { DataSource } from '../adapters/DataSource'
import { appKeys } from './queryClient'

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

export function boardOptions(source: DataSource, range: BoardRange) {
  const { rangeStart, rangeEnd, containerStart, containerEnd, today } = range
  return queryOptions({
    queryKey: [...appKeys.tasks, 'board', range],
    queryFn: async ({ signal }) => {
      try {
        const [rangeTasks, bucketTasks, rondelItems, reminderTasks, leftUndone] = await Promise.all([
          source.listTasksInRange(rangeStart, rangeEnd),
          source.listBucketTasks('bucket-list'),
          source.listRondelItems(),
          source.listUpcomingReminders(today),
          source.listLeftUndone(today),
        ])
        return {
          rangeTasks, bucketTasks, reminderTasks, leftUndone, today,
          containerItems: rondelItems.filter((task) => showsInRondelContainer(task, { start: containerStart, end: containerEnd }, today)),
          undecided: rondelItems.filter((task) => isWaitingForDecision(task, today)),
        }
      } catch (error) {
        if (signal.aborted) console.error('[rondel] Superseded task load failed', error)
        throw error
      }
    },
  })
}
