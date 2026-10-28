import { useEffect, useMemo } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Task } from '../../domain/types'
import { localDataSource } from '../../services/adapters/localDataSource'
import { boardOptions, type BoardRange } from '../../services/queries/appQueries'
import type { DataPreparation, ReportError } from '../app/useAppData'

const EMPTY: Task[] = []

export function useBoardData(range: BoardRange, preparation: DataPreparation, reportError: ReportError) {
  const client = useQueryClient()
  const { ready: enabled } = preparation
  const { rangeStart, rangeEnd, containerStart, containerEnd, today } = range
  const options = useMemo(() => boardOptions(localDataSource, {
    rangeStart, rangeEnd, containerStart, containerEnd, today,
  }), [rangeStart, rangeEnd, containerStart, containerEnd, today])
  // Keep reminders available while a newly selected range is still loading.
  const query = useQuery({ ...options, enabled, placeholderData: keepPreviousData })
  useEffect(() => {
    if (!preparation.ready) return
    // A fast refresh can batch preparation into one render without toggling enabled.
    // Only refetch this range if enabling it has not already supplied fresh data.
    void client.refetchQueries({ queryKey: options.queryKey, exact: true, stale: true, type: 'active' }, { cancelRefetch: false })
  }, [client, options.queryKey, preparation])
  useEffect(() => {
    if (enabled && query.error) reportError('Unable to load tasks', query.error)
  }, [enabled, query.error, reportError])

  return {
    ready: enabled && query.isSuccess && !query.isFetching && !query.isStale && !query.isPlaceholderData,
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
