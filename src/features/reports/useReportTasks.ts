import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Task } from '../../domain/types'
import type { DataSource } from '../../services/adapters/DataSource'
import { appKeys } from '../../services/queries/queryClient'
import type { DataPreparation } from '../app/useAppData'

const EMPTY: Task[] = []
const READY: DataPreparation = { ready: true, request: 0 }

export function useReportTasks(source: DataSource, onError: (context: string, error: unknown) => void, preparation = READY) {
  const { ready: enabled } = preparation
  const client = useQueryClient()
  const query = useQuery({
    queryKey: appKeys.reports,
    enabled,
    queryFn: async ({ signal }) => {
      try {
        return await source.listAllTasks()
      } catch (error) {
        if (signal.aborted) console.error('[rondel] Superseded report load failed', error)
        throw error
      }
    },
  })
  const reload = useCallback(async () => {
    if (!enabled) return
    await client.cancelQueries({ queryKey: appKeys.reports })
    await client.invalidateQueries({ queryKey: appKeys.reports })
  }, [client, enabled])
  useEffect(() => {
    if (preparation.ready) void client.refetchQueries({ queryKey: appKeys.reports, exact: true, stale: true, type: 'active' }, { cancelRefetch: false })
  }, [client, preparation])
  useEffect(() => {
    if (enabled && query.error) onError('Unable to load reports', query.error)
  }, [enabled, query.error, onError])
  useEffect(() => {
    const focus = () => { void reload() }
    window.addEventListener('focus', focus)
    return () => window.removeEventListener('focus', focus)
  }, [reload])
  return { tasks: query.data ?? EMPTY, loading: query.isPending, error: query.error?.message ?? null, reload }
}
