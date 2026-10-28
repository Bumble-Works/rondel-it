import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Task } from '../../domain/types'
import { localDataSource } from '../../services/adapters/localDataSource'
import { boardOptions, type BoardRange } from '../../services/queries/appQueries'
import type { ReportError } from '../app/useAppData'

const EMPTY: Task[] = []

export function useBoardData(range: BoardRange, enabled: boolean, reportError: ReportError) {
  const query = useQuery({ ...boardOptions(localDataSource, range), enabled })
  useEffect(() => {
    if (enabled && query.error) reportError('Unable to load tasks', query.error)
  }, [enabled, query.error, reportError])

  return {
    ready: enabled && query.isSuccess && !query.isFetching && !query.isStale,
    updatedAt: query.dataUpdatedAt,
    today: query.data?.today,
    rangeTasks: query.data?.rangeTasks ?? EMPTY,
    bucketTasks: query.data?.bucketTasks ?? EMPTY,
    containerItems: query.data?.containerItems ?? EMPTY,
    reminderTasks: query.data?.reminderTasks ?? EMPTY,
    undecided: query.data?.undecided ?? EMPTY,
    leftUndone: query.data?.leftUndone ?? EMPTY,
  }
}
