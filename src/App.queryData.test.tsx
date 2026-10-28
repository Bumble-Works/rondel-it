import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react'
import { onlineManager } from '@tanstack/react-query'
import App from './App'
import { useAppData } from './features/app/useAppData'
import { useMetadataActions } from './features/app/useMetadataActions'
import { useReportTasks } from './features/reports/useReportTasks'
import { useTaskActions } from './features/task/useTaskActions'
import { localDataSource as source } from './services/adapters/localDataSource'
import type { RecurringRuleInput } from './services/adapters/DataSource'
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

it('keeps recurring rules available for repair if materialization fails', async () => {
  const input: RecurringRuleInput = {
    title: 'Daily task', kind: 'repeat',
    repeat: { unit: 'day', every: 1, startDate: '2026-10-26', endDate: null },
  }
  const rule = await source.createRecurringRule(input)
  const error = new Error('Unable to materialize this rule')
  vi.spyOn(source, 'syncRecurring').mockRejectedValueOnce(error)
  const reportError = vi.fn()
  const { wrapper } = createQueryWrapper()
  const { result } = renderHook(() => {
    const data = useAppData(reportError)
    const metadata = useMetadataActions({ refresh: data.refresh, reportError, scheduleSync: vi.fn() })
    return { data, metadata }
  }, { wrapper })
  await waitFor(() => expect(result.current.data.rules).toHaveLength(1))
  expect(result.current.data.ready).toBe(false)
  expect(reportError).toHaveBeenCalledWith('Unable to prepare recurring tasks', error)
  await act(() => result.current.metadata.updateRule(rule.id, { ...input, title: 'Repaired task' }))
  await waitFor(() => expect(result.current.data.ready).toBe(true))
  expect(result.current.data.rules[0].title).toBe('Repaired task')
})

it('shows and rolls back a flag immediately, reports failure, and avoids collection reloads', async () => {
  await source.createTask({ title: 'Flag task', dayDate: '2026-10-26' })
  renderWithQuery(<App />)
  await screen.findByRole('button', { name: 'Open Flag task' })
  const readRange = vi.spyOn(source, 'listTasksInRange')
  const materialize = vi.spyOn(source, 'syncRecurring')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  let reject!: (error: Error) => void
  vi.spyOn(source, 'updateTask').mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
  fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Flag as important' }))
  await screen.findByTitle('Important')
  await act(async () => reject(new Error('Unable to save flag')))
  await screen.findByText('Something went wrong: Unable to save flag')
  expect(screen.queryByTitle('Important')).not.toBeInTheDocument()
  expect(readRange).not.toHaveBeenCalled()
  expect(materialize).not.toHaveBeenCalled()
})

it('updates a title and note immediately in details and rows, then saves them in order', async () => {
  const task = await source.createTask({ title: 'Original title', dayDate: '2026-10-26' })
  renderWithQuery(<App />)
  fireEvent.click(await screen.findByRole('button', { name: 'Open Original title' }))
  const panel = screen.getByRole('complementary', { name: 'Task details' })
  const readRange = vi.spyOn(source, 'listTasksInRange')
  const note = within(panel).getByLabelText('Note')
  fireEvent.change(note, { target: { value: 'Saved note' } })
  fireEvent.blur(note)
  await screen.findByText('Saved note', { selector: '.task-note-preview' })
  await waitFor(async () => expect((await source.getTask(task.id)).note).toBe('Saved note'))
  expect(readRange).not.toHaveBeenCalled()
})

it('materializes the next waiting occurrence after finishing a recurring task', async () => {
  vi.setSystemTime(new Date(2026, 9, 19, 8))
  await source.createRecurringRule({ title: 'Weekly task', kind: 'weekly-start' })
  await source.syncRecurring('2026-10-19')
  vi.setSystemTime(new Date(2026, 9, 26, 8))
  const original = (await source.listAllTasks())[0]
  const reportError = vi.fn()
  const { wrapper } = createQueryWrapper()
  const { result } = renderHook(() => {
    const data = useAppData(reportError)
    const actions = useTaskActions({ refresh: data.refresh, reportError, scheduleSync: vi.fn() })
    const reports = useReportTasks(source, reportError, data.preparation)
    return { actions, reports }
  }, { wrapper })
  await waitFor(() => expect(result.current.reports.tasks).toHaveLength(1))
  await act(() => result.current.actions.setDone(original))
  await waitFor(() => expect(result.current.reports.tasks).toHaveLength(2))
  expect(result.current.reports.tasks.find((task) => task.id !== original.id)).toMatchObject({
    status: 'todo', dayDate: '2026-10-26', rondeled: true,
  })
  expect(reportError).not.toHaveBeenCalled()
})
