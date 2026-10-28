import { renderWithQuery as render } from './test/queryTestUtils'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import App from './App'
import type { Task, UserSetting } from './domain/types'
import { useSchedule } from './features/reminders/useSchedule'
import { announceReview } from './features/reminders/announceReview'
import { useSync } from './features/sync/useSync'
import { localDataSource as dataSource } from './services/adapters/localDataSource'
import { reportFixtureTask as task } from './test/reportFixtures'

vi.mock('./features/sync/useSync', () => ({ useSync: vi.fn() }))
vi.mock('./features/reminders/useSchedule', () => ({ useSchedule: vi.fn() }))
vi.mock('./features/reminders/announceReview', () => ({ announceReview: vi.fn(async () => {}) }))
vi.mock('./features/board/useScrollToToday', () => ({ useScrollToToday: vi.fn() }))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

const settings: UserSetting = {
  weekStartDay: 1, dayStartTime: '09:00', endOfDayTime: '17:00', timezone: 'UTC',
}
const monday = task({ id: 'monday', title: 'Monday task', dayDate: '2026-10-26' })
const tuesday = task({ id: 'tuesday', title: 'Tuesday task', dayDate: '2026-10-27' })
let remoteChange: () => void
let schedule: Parameters<typeof useSchedule>[0]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 26, 8))
  vi.spyOn(dataSource, 'listTags').mockResolvedValue([])
  vi.spyOn(dataSource, 'getSettings').mockImplementation(async () => ({ ...settings }))
  vi.spyOn(dataSource, 'listRecurringRules').mockResolvedValue([])
  vi.spyOn(dataSource, 'syncRecurring').mockResolvedValue()
  vi.spyOn(dataSource, 'listTasksInRange').mockResolvedValue([])
  vi.spyOn(dataSource, 'listBucketTasks').mockResolvedValue([])
  vi.spyOn(dataSource, 'listRondelItems').mockResolvedValue([])
  vi.spyOn(dataSource, 'listUpcomingReminders').mockResolvedValue([])
  vi.spyOn(dataSource, 'listLeftUndone').mockResolvedValue([])
  vi.mocked(announceReview).mockClear()
  vi.mocked(useSchedule).mockImplementation((options) => { schedule = options })
  vi.mocked(useSync).mockImplementation((options) => {
    remoteChange = options.onRemoteChange
    return {
      state: { available: false, folder: null, lastSyncedAt: null, syncing: false, warning: null },
      scheduleSync: vi.fn(), sync: vi.fn(), chooseFolder: vi.fn(), showInFinder: vi.fn(), turnOff: vi.fn(),
    }
  })
})

it.each(['resolve', 'reject'] as const)('ignores a previous day load that finishes with %s after navigation', async (finish) => {
  const old = deferred<Task[]>()
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(dataSource.listTasksInRange).mockReturnValueOnce(old.promise).mockResolvedValue([tuesday])
  // An old result must not restore reminders or waiting items, either.
  vi.mocked(dataSource.listUpcomingReminders).mockResolvedValueOnce([monday])
  vi.mocked(dataSource.listRondelItems).mockResolvedValueOnce([
    task({ id: 'waiting', title: 'Old waiting item', dayDate: '2026-10-19', rondeled: true }),
  ])
  render(<App />)
  await waitFor(() => expect(dataSource.listTasksInRange).toHaveBeenCalledTimes(1))
  act(() => schedule.onReview('start'))
  fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
  await screen.findByRole('button', { name: 'Open Tuesday task' })
  await act(async () => {
    if (finish === 'resolve') old.resolve([monday])
    else old.reject(new Error('Old load failed'))
  })
  expect(screen.getByRole('button', { name: 'Open Tuesday task' })).toBeInTheDocument()
  expect(screen.queryByText(/Old load failed/)).not.toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Don’t lose these' })).not.toBeInTheDocument()
  expect(schedule.reminders).toEqual([])
  expect(announceReview).not.toHaveBeenCalled()
  if (finish === 'reject') expect(errorLog).toHaveBeenCalledWith('[rondel] Superseded task load failed', expect.any(Error))
})

it('refreshes the current day when an edit from another day finishes', async () => {
  const edit = deferred<Task>()
  vi.spyOn(dataSource, 'advanceTask').mockReturnValue(edit.promise)
  vi.mocked(dataSource.listTasksInRange).mockImplementation(async (start) => start === monday.dayDate ? [monday] : [tuesday])
  render(<App />)
  await screen.findByRole('button', { name: 'Open Monday task' })
  fireEvent.click(screen.getByRole('button', { name: 'Mark as doing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
  await screen.findByRole('button', { name: 'Open Tuesday task' })
  await act(async () => edit.resolve({ ...monday, status: 'doing' }))
  await waitFor(() => expect(dataSource.listTasksInRange).toHaveBeenCalledTimes(3))
  expect(dataSource.listTasksInRange).toHaveBeenLastCalledWith('2026-10-27', '2026-10-27')
  expect(screen.getByRole('button', { name: 'Open Tuesday task' })).toBeInTheDocument()
})

it('reloads the board once after remote sync, using the newly loaded week start', async () => {
  render(<App />)
  await waitFor(() => expect(dataSource.listTasksInRange).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByRole('button', { name: 'Week' }))
  await waitFor(() => expect(dataSource.listTasksInRange).toHaveBeenLastCalledWith('2026-10-26', '2026-11-01'))
  vi.mocked(dataSource.listTasksInRange).mockClear()
  vi.mocked(dataSource.getSettings).mockResolvedValue({ ...settings, weekStartDay: 0 })
  await act(async () => remoteChange())
  await waitFor(() => expect(dataSource.listTasksInRange).toHaveBeenCalledWith('2026-10-25', '2026-10-31'))
  expect(dataSource.listTasksInRange).toHaveBeenCalledTimes(1)
})

it.each(['resolve', 'reject'] as const)('ignores superseded app data that finishes with %s after a sync refresh', async (finish) => {
  const old = deferred<UserSetting>()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(dataSource.getSettings).mockReturnValueOnce(old.promise)
  vi.mocked(dataSource.listTags)
    .mockResolvedValueOnce([{ id: 'old', name: 'Old tag', color: '#5486f5' }])
    .mockResolvedValue([{ id: 'new', name: 'New tag', color: '#5486f5' }])
  render(<App />)
  await waitFor(() => expect(dataSource.getSettings).toHaveBeenCalledTimes(1))
  act(() => remoteChange())
  await screen.findByRole('button', { name: 'New tag' })
  await act(async () => {
    if (finish === 'resolve') old.resolve({ ...settings, weekStartDay: 0 })
    else old.reject(new Error('Old settings failed'))
  })
  expect(screen.getByRole('button', { name: 'New tag' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Old tag' })).not.toBeInTheDocument()
  expect(screen.queryByText(/Old settings failed/)).not.toBeInTheDocument()
  expect(dataSource.listTasksInRange).toHaveBeenCalledTimes(1)
})

it('rejects an old board result as soon as remote sync begins reloading app data', async () => {
  const oldBoard = deferred<Task[]>()
  const syncedSettings = deferred<UserSetting>()
  vi.mocked(dataSource.listTasksInRange).mockReturnValueOnce(oldBoard.promise).mockResolvedValue([{ ...monday, title: 'Synced task' }])
  render(<App />)
  await waitFor(() => expect(dataSource.listTasksInRange).toHaveBeenCalledTimes(1))
  vi.mocked(dataSource.getSettings).mockReturnValueOnce(syncedSettings.promise)
  act(() => remoteChange())
  await act(async () => oldBoard.resolve([monday]))
  expect(screen.queryByRole('button', { name: 'Open Monday task' })).not.toBeInTheDocument()
  await act(async () => syncedSettings.resolve({ ...settings }))
  await screen.findByRole('button', { name: 'Open Synced task' })
  expect(dataSource.listTasksInRange).toHaveBeenCalledTimes(2)
})

it('keeps the current load error when an older successful response arrives', async () => {
  const old = deferred<Task[]>()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(dataSource.listTasksInRange).mockReturnValueOnce(old.promise).mockRejectedValueOnce(new Error('Current load failed'))
  render(<App />)
  await waitFor(() => expect(dataSource.listTasksInRange).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
  await screen.findByText('Unable to load tasks: Current load failed')
  await act(async () => old.resolve([monday]))
  expect(screen.getByText('Unable to load tasks: Current load failed')).toBeInTheDocument()
})

it('does not announce a queued review after unmounting during a load', async () => {
  const pending = deferred<Task[]>()
  vi.mocked(dataSource.listTasksInRange).mockReturnValue(pending.promise)
  vi.mocked(dataSource.listLeftUndone).mockResolvedValue([monday])
  const { unmount } = render(<App />)
  await waitFor(() => expect(dataSource.listTasksInRange).toHaveBeenCalledTimes(1))
  act(() => schedule.onReview('start'))
  unmount()
  await act(async () => pending.resolve([]))
  expect(announceReview).not.toHaveBeenCalled()
})

it('loads reminders for the new day when midnight fires', async () => {
  render(<App />)
  await waitFor(() => expect(dataSource.listUpcomingReminders).toHaveBeenCalledWith('2026-10-26'))
  vi.setSystemTime(new Date(2026, 9, 27, 0))
  await act(async () => schedule.onNewDay())
  await waitFor(() => expect(dataSource.listUpcomingReminders).toHaveBeenLastCalledWith('2026-10-27'))
})
