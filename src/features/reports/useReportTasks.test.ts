import { act, renderHook, waitFor } from '@testing-library/react'
import type { Task } from '../../domain/types'
import type { DataSource } from '../../services/adapters/DataSource'
import { reportFixtureTask as task } from '../../test/reportFixtures'
import { useReportTasks } from './useReportTasks'
import { createQueryWrapper } from '../../test/queryTestUtils'
import { appKeys } from '../../services/queries/queryClient'

function deferred() {
  let resolve!: (tasks: Task[]) => void
  let reject!: (error: Error) => void
  const promise = new Promise<Task[]>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

it('shares one loaded dataset until task changes or window focus request a refresh', async () => {
  const listAllTasks = vi.fn().mockResolvedValue([task({ title: 'Original' })])
  const source = { listAllTasks } as unknown as DataSource
  const onError = vi.fn()
  const { client, wrapper } = createQueryWrapper()
  const { result, rerender } = renderHook(() => useReportTasks(source, onError), { wrapper })
  await waitFor(() => expect(result.current.tasks[0]?.title).toBe('Original'))
  rerender()
  expect(listAllTasks).toHaveBeenCalledTimes(1)
  listAllTasks.mockResolvedValue([task({ title: 'Edited' })])
  await act(() => client.invalidateQueries({ queryKey: appKeys.tasks }))
  await waitFor(() => expect(result.current.tasks[0]?.title).toBe('Edited'))
  expect(listAllTasks).toHaveBeenCalledTimes(2)
  listAllTasks.mockResolvedValue([task({ title: 'Synced' })])
  act(() => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(result.current.tasks[0]?.title).toBe('Synced'))
  expect(listAllTasks).toHaveBeenCalledTimes(3)
  expect(onError).not.toHaveBeenCalled()
})

it('reports load errors and lets a successful retry clear the error and supply data', async () => {
  const error = new Error('Storage unavailable')
  const listAllTasks = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce([task()])
  const source = { listAllTasks } as unknown as DataSource
  const onError = vi.fn()
  const { wrapper } = createQueryWrapper()
  const { result } = renderHook(() => useReportTasks(source, onError), { wrapper })
  await waitFor(() => expect(result.current.error).toBe('Storage unavailable'))
  expect(result.current.loading).toBe(false)
  expect(onError).toHaveBeenCalledWith('Unable to load reports', error)
  await act(() => result.current.reload())
  await waitFor(() => expect(result.current.error).toBeNull())
  expect(result.current.tasks).toHaveLength(1)
})

it.each(['resolve', 'reject'] as const)('ignores an older load that finishes with %s after a newer refresh succeeds', async (finish) => {
  const old = deferred()
  const listAllTasks = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce([task({ title: 'Latest' })])
  const source = { listAllTasks } as unknown as DataSource
  const onError = vi.fn()
  const { wrapper } = createQueryWrapper()
  const { result } = renderHook(() => useReportTasks(source, onError), { wrapper })
  act(() => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(result.current.tasks[0]?.title).toBe('Latest'))
  await act(async () => {
    if (finish === 'resolve') old.resolve([task({ title: 'Stale' })])
    else old.reject(new Error('Stale failure'))
    if (finish === 'reject') await expect(old.promise).rejects.toThrow('Stale failure')
    else await old.promise
  })
  expect(result.current.tasks[0].title).toBe('Latest')
  expect(result.current.error).toBeNull()
  expect(result.current.loading).toBe(false)
  expect(onError).not.toHaveBeenCalled()
})
