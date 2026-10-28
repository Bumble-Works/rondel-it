import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Task } from '../../domain/types'
import type { DataSource } from '../../services/adapters/DataSource'
import { appKeys } from '../../services/queries/queryClient'

const EMPTY: Task[] = []

export function useReportTasks(source: DataSource, onError: (context: string, error: unknown) => void, enabled = true) {
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
    if (enabled && query.error) onError('Unable to load reports', query.error)
  }, [enabled, query.error, onError])
  useEffect(() => {
    const focus = () => { void reload() }
    window.addEventListener('focus', focus)
    return () => window.removeEventListener('focus', focus)
  }, [reload])
  return { tasks: query.data ?? EMPTY, loading: query.isPending, error: query.error?.message ?? null, reload }
}
