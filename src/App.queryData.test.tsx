import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react'
import { onlineManager } from '@tanstack/react-query'
import App from './App'
import { useAppData } from './features/app/useAppData'
import { useMetadataActions } from './features/app/useMetadataActions'
import { useReportTasks } from './features/reports/useReportTasks'
import { useTaskActions } from './features/task/useTaskActions'
import { localDataSource as source } from './services/adapters/localDataSource'
import { createQueryWrapper, renderWithQuery } from './test/queryTestUtils'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 26, 8))
})
afterEach(() => onlineManager.setOnline(true))

it('loads, creates, and edits local tasks while the device is offline', async () => {
  onlineManager.setOnline(false)
  await source.createTask({ title: 'Offline task', dayDate: '2026-10-26' })
  const { queryClient } = renderWithQuery(<App />)
  await screen.findByRole('button', { name: 'Open Offline task' })
  fireEvent.click(screen.getByRole('button', { name: 'Mark as doing' }))
  await screen.findByRole('button', { name: 'Mark as done' })
  const input = screen.getByPlaceholderText('Add a task')
  fireEvent.change(input, { target: { value: 'Created offline' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  await screen.findByRole('button', { name: 'Open Created offline' })
  expect((await source.listAllTasks()).map((task) => [task.title, task.status])).toEqual([
    ['Offline task', 'doing'], ['Created offline', 'todo'],
  ])
  expect(queryClient.getMutationCache().getAll().some((mutation) => mutation.state.isPaused)).toBe(false)
})

it('invalidates open reports after a task mutation without reloading metadata', async () => {
  const task = await source.createTask({ title: 'Report task', dayDate: '2026-10-26' })
  const listAll = vi.spyOn(source, 'listAllTasks')
  const listTags = vi.spyOn(source, 'listTags')
  const reportError = vi.fn()
  const scheduleSync = vi.fn()
  const { wrapper } = createQueryWrapper()
  const { result } = renderHook(() => {
    const data = useAppData(reportError)
    const actions = useTaskActions({ refresh: data.refresh, reportError, scheduleSync })
    const reports = useReportTasks(source, reportError, data.preparation)
    return { actions, reports }
  }, { wrapper })
  await waitFor(() => expect(result.current.reports.tasks[0]?.status).toBe('todo'))
  await act(() => result.current.actions.advance(task))
  await waitFor(() => expect(result.current.reports.tasks[0]?.status).toBe('doing'))
  expect(listAll).toHaveBeenCalledTimes(2)
  expect(listTags).toHaveBeenCalledTimes(1)
  expect(scheduleSync).toHaveBeenCalledTimes(1)
  expect(reportError).not.toHaveBeenCalled()
})

it('keeps a settings edit when an earlier remote refresh finishes later', async () => {
  const initial = await source.getSettings()
  let resolve!: (settings: typeof initial) => void
  const pending = new Promise<typeof initial>((done) => { resolve = done })
  const readSettings = source.getSettings
  const getSettings = vi.spyOn(source, 'getSettings').mockResolvedValueOnce(initial).mockReturnValueOnce(pending).mockImplementation(readSettings)
  const reportError = vi.fn()
  const { wrapper } = createQueryWrapper()
  const { result } = renderHook(() => {
    const data = useAppData(reportError)
    const metadata = useMetadataActions({ refresh: data.refresh, reportError, scheduleSync: vi.fn() })
    return { data, metadata }
  }, { wrapper })
  await waitFor(() => expect(result.current.data.ready).toBe(true))
  let remotePass!: Promise<void>
  act(() => { remotePass = result.current.data.refresh({ metadata: true, recurring: true }) })
  await waitFor(() => expect(getSettings).toHaveBeenCalledTimes(2))
  await act(() => result.current.metadata.updateSettings({ weekStartDay: 0 }))
  await waitFor(() => expect(result.current.data.settings?.weekStartDay).toBe(0))
  await act(async () => { resolve(initial); await remotePass })
  expect(result.current.data.settings?.weekStartDay).toBe(0)
  expect(result.current.data.ready).toBe(true)
  expect(reportError).not.toHaveBeenCalled()
})
