import { useCallback, useEffect, useRef, useState } from 'react'
import type { Task } from '../../domain/types'
import type { DataSource } from '../../services/adapters/DataSource'

export function useReportTasks(dataSource: DataSource, revision: number, onError: (context: string, error: unknown) => void) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const request = useRef(0)
  const reload = useCallback(async () => {
    const current = ++request.current
    try {
      const loaded = await dataSource.listAllTasks()
      if (current !== request.current) return
      setTasks(loaded)
      setError(null)
    } catch (cause) {
      if (current !== request.current) return
      setError(cause instanceof Error ? cause.message : String(cause))
      onError('Unable to load reports', cause)
    } finally {
      if (current === request.current) setLoading(false)
    }
  }, [dataSource, onError])
  useEffect(() => {
    // Adapter reads are asynchronous; reload sets state only after awaiting them.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
    const focus = () => void reload()
    window.addEventListener('focus', focus)
    return () => {
      request.current += 1
      window.removeEventListener('focus', focus)
    }
  }, [reload, revision])
  return { tasks, loading, error, reload }
}
