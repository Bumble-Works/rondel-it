import { useCallback, useEffect, useRef, useState } from 'react'
import { isCancelledError, useQuery, useQueryClient } from '@tanstack/react-query'
import { todayIso } from '../../domain/dates'
import type { RecurringRule, Tag } from '../../domain/types'
import { localDataSource } from '../../services/adapters/localDataSource'
import { appDataOptions } from '../../services/queries/appQueries'
import { appKeys } from '../../services/queries/queryClient'
import { createRecurringSync } from '../../services/queries/recurringSync'

const EMPTY_TAGS: Tag[] = []
const EMPTY_RULES: RecurringRule[] = []
export type ReportError = (context: string, error: unknown) => void
export interface RefreshOptions { metadata?: boolean; recurring?: boolean }
export type RefreshData = (options?: RefreshOptions) => Promise<void>
export interface DataPreparation { ready: boolean }

export function useAppData(reportError: ReportError) {
  const client = useQueryClient()
  const [preparation, setPreparation] = useState<DataPreparation>({ ready: false })
  const { ready } = preparation
  const [recurringSync] = useState(() => createRecurringSync(localDataSource))
  const request = useRef(0)
  const metadata = useQuery({ ...appDataOptions(localDataSource), enabled: ready })

  const refresh: RefreshData = useCallback(async ({ metadata: reloadMetadata = false, recurring = false } = {}) => {
    const current = ++request.current
    setPreparation({ ready: false })
    await client.cancelQueries({ queryKey: appKeys.tasks })
    await client.invalidateQueries({ queryKey: appKeys.tasks, refetchType: 'none' })
    if (reloadMetadata) {
      await client.cancelQueries({ queryKey: appKeys.metadata })
      await client.invalidateQueries({ queryKey: appKeys.metadata, refetchType: 'none' })
    }
    let recurringReady = false
    try {
      if (recurring) recurringSync.invalidate()
      await recurringSync.ensure(todayIso())
      recurringReady = true
      if (current !== request.current) return
      await client.fetchQuery(appDataOptions(localDataSource))
      if (current === request.current) setPreparation({ ready: true })
    } catch (error) {
      if (isCancelledError(error)) return
      if (current === request.current) {
        reportError(recurringReady ? 'Unable to load app data' : 'Unable to prepare recurring tasks', error)
        if (!recurringReady) {
          // Keep Settings and Recurring usable so a failed rule can be repaired.
          try { await client.fetchQuery(appDataOptions(localDataSource)) }
          catch (loadError) {
            if (!isCancelledError(loadError) && current === request.current) reportError('Unable to load app data', loadError)
          }
        }
      }
      else console.error('[rondel] Superseded app-data refresh failed', error)
    }
  }, [client, recurringSync, reportError])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh({ metadata: true })
    return () => {
      request.current += 1
      void client.cancelQueries({ queryKey: appKeys.tasks })
      void client.cancelQueries({ queryKey: appKeys.metadata })
    }
  }, [client, refresh])

  return {
    ready, preparation, refresh,
    tags: metadata.data?.tags ?? EMPTY_TAGS,
    settings: metadata.data?.settings ?? null,
    rules: metadata.data?.rules ?? EMPTY_RULES,
  }
}
