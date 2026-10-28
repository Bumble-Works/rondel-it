import { act, renderHook, waitFor } from '@testing-library/react'
import { isWaitingForDecision } from '../../domain/rondel'
import type { Task } from '../../domain/types'
import { localDataSource as source } from '../../services/adapters/localDataSource'
import { boardOptions, type BoardData } from '../../services/queries/appQueries'
import { appKeys } from '../../services/queries/queryClient'
import { createQueryWrapper } from '../../test/queryTestUtils'
import { useTaskActions } from './useTaskActions'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

const range = {
  rangeStart: '2026-10-27', rangeEnd: '2026-10-27',
  containerStart: '2026-10-26', containerEnd: '2026-11-01', today: '2026-10-27',
}

async function mountActions() {
  const { client, wrapper } = createQueryWrapper()
  await client.fetchQuery(boardOptions(source, range))
  await client.fetchQuery({ queryKey: appKeys.reports, queryFn: () => source.listAllTasks() })
  const services = { refresh: vi.fn(async () => {}), reportError: vi.fn(), scheduleSync: vi.fn() }
  const { result } = renderHook(() => useTaskActions(services), { wrapper })
  return {
    client, result, services,
    board: () => client.getQueryData<BoardData>(boardOptions(source, range).queryKey)!,
    reports: () => client.getQueryData<Task[]>(appKeys.reports)!,
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 8))
})

it.each([
  ['next week', '2026-11-02'],
  ['next month', '2026-11-01'],
])('postpones a waiting task to %s and records the new period', async (_period, dayDate) => {
  const task = await source.createTask({ title: 'Waiting', dayDate: range.containerStart, rondeled: true })
  const { result } = await mountActions()
  await act(() => result.current.rondel(task, { toDate: dayDate, rondeled: true }))
  const saved = await source.getTask(task.id)
  expect(saved).toMatchObject({
    dayDate, rondeled: true, status: 'todo', rondelCount: 1,
    rondelHistory: [{ fromDate: range.containerStart, toDate: dayDate }],
  })
  expect(isWaitingForDecision(saved, range.today)).toBe(false)
})

it('keeps a waiting task in its original period when dragging within Unassigned', async () => {
  const task = await source.createTask({ title: 'Waiting', dayDate: '2026-10-19', rondeled: true })
  const { result } = await mountActions()
  await act(() => result.current.move(task, { dayDate: range.today, rondeled: true }, null))
  expect(await source.getTask(task.id)).toMatchObject({
    dayDate: '2026-10-19', rondeled: true, rondelCount: 0, rondelHistory: [],
  })
})

it('shows a title optimistically in board, reminder, and report caches without reloading collections', async () => {
  const task = await source.createTask({ title: 'Original', dayDate: range.today, reminderTime: '10:00' })
  const { result, services, board, reports } = await mountActions()
  const write = source.updateTask
  const save = deferred<void>()
  vi.spyOn(source, 'updateTask').mockImplementation(async (id, input) => { await save.promise; return write(id, input) })
  const readRange = vi.spyOn(source, 'listTasksInRange')
  const materialize = vi.spyOn(source, 'syncRecurring')
  let pending!: Promise<Task | null>
  act(() => { pending = result.current.update(task.id, { title: '  Edited  ' }) })
  await waitFor(() => expect(board().rangeTasks[0].title).toBe('Edited'))
  expect(board().reminderTasks[0].title).toBe('Edited')
  expect(reports()[0].title).toBe('Edited')
  expect((await source.getTask(task.id)).title).toBe('Original')
  await act(async () => { save.resolve(); await pending })
  expect((await source.getTask(task.id)).title).toBe('Edited')
  expect(readRange).not.toHaveBeenCalled()
  expect(materialize).not.toHaveBeenCalled()
  expect(services.refresh).not.toHaveBeenCalled()
  expect(services.scheduleSync).toHaveBeenCalledTimes(1)
})

it('rolls back a failed note without undoing a successful edit to another task', async () => {
  const first = await source.createTask({ title: 'First', dayDate: range.today })
  const second = await source.createTask({ title: 'Second', dayDate: range.today })
  const { result, services, board, reports } = await mountActions()
  const save = deferred<Task>()
  const write = source.updateTask
  vi.spyOn(source, 'updateTask').mockImplementation((id, input) => id === first.id ? save.promise : write(id, input))
  let pending!: Promise<Task | null>
  act(() => { pending = result.current.update(first.id, { note: 'Pending note' }) })
  await waitFor(() => expect(board().rangeTasks.find((task) => task.id === first.id)?.note).toBe('Pending note'))
  await act(() => result.current.update(second.id, { note: 'Saved note' }))
  await act(async () => { save.reject(new Error('Save failed')); await pending })
  expect(reports().find((task) => task.id === first.id)?.note).toBe('')
  expect(reports().find((task) => task.id === second.id)?.note).toBe('Saved note')
  expect(board().rangeTasks.find((task) => task.id === second.id)?.note).toBe('Saved note')
  expect(services.reportError).toHaveBeenCalledWith('Something went wrong', expect.objectContaining({ message: 'Save failed' }))
  expect(services.scheduleSync).toHaveBeenCalledTimes(1)
})

it('queues edits to one task while allowing another task to save', async () => {
  const first = await source.createTask({ title: 'First', dayDate: range.today })
  const second = await source.createTask({ title: 'Second', dayDate: range.today })
  const { client, result, board } = await mountActions()
  const save = deferred<void>()
  const write = source.updateTask
  const update = vi.spyOn(source, 'updateTask').mockImplementationOnce(async (id, input) => { await save.promise; return write(id, input) })
  let initial!: Promise<Task | null>
  let queued!: Promise<Task | null>
  act(() => {
    initial = result.current.update(first.id, { title: 'First edit' })
    queued = result.current.update(first.id, { title: 'Second edit' })
  })
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
  const mutations = client.getMutationCache().getAll()
  expect(mutations.filter((mutation) => mutation.options.scope?.id === `task:${first.id}`)).toHaveLength(2)
  expect(mutations.some((mutation) => mutation.state.isPaused)).toBe(true)
  await act(() => result.current.update(second.id, { note: 'Independent edit' }))
  expect(update.mock.calls.map(([id]) => id)).toEqual([first.id, second.id])
  await act(async () => { save.resolve(); await Promise.all([initial, queued]) })
  expect(update.mock.calls.map(([id]) => id)).toEqual([first.id, second.id, first.id])
  expect(board().rangeTasks.find((task) => task.id === first.id)?.title).toBe('Second edit')
  expect((await source.getTask(first.id)).title).toBe('Second edit')
})

it('calculates queued flag toggles from the latest saved task', async () => {
  const task = await source.createTask({ title: 'Task', dayDate: range.today })
  const { result, board } = await mountActions()
  const save = deferred<void>()
  const write = source.updateTask
  const update = vi.spyOn(source, 'updateTask').mockImplementationOnce(async (id, input) => { await save.promise; return write(id, input) })
  let initial!: Promise<Task | null>
  let queued!: Promise<Task | null>
  act(() => { initial = result.current.toggleFlag(task); queued = result.current.toggleFlag(task) })
  await waitFor(() => expect(board().rangeTasks[0].flagged).toBe(true))
  await act(async () => { save.resolve(); await Promise.all([initial, queued]) })
  expect(update.mock.calls.map(([, input]) => input.flagged)).toEqual([true, false])
  expect((await source.getTask(task.id)).flagged).toBe(false)
  expect(board().rangeTasks[0].flagged).toBe(false)
})

it('continues a task queue after a failed save', async () => {
  const task = await source.createTask({ title: 'Task', dayDate: range.today })
  const { result, board, services } = await mountActions()
  vi.spyOn(source, 'updateTask').mockRejectedValueOnce(new Error('First save failed'))
  let initial!: Promise<Task | null>
  let queued!: Promise<Task | null>
  act(() => { initial = result.current.toggleFlag(task); queued = result.current.update(task.id, { note: 'Next edit' }) })
  await act(async () => { await Promise.all([initial, queued]) })
  expect(await initial).toBeNull()
  expect(board().rangeTasks[0]).toMatchObject({ flagged: false, note: 'Next edit' })
  expect(services.reportError).toHaveBeenCalledTimes(1)
})

it('keeps optimism across new range reads and restores a newer synced value on failure', async () => {
  const task = await source.createTask({ title: 'Original', dayDate: range.today })
  const { client, result, board } = await mountActions()
  const save = deferred<Task>()
  const write = source.updateTask
  vi.spyOn(source, 'updateTask').mockReturnValueOnce(save.promise)
  let pending!: Promise<Task | null>
  act(() => { pending = result.current.update(task.id, { title: 'Pending title' }) })
  await waitFor(() => expect(board().rangeTasks[0].title).toBe('Pending title'))
  await write(task.id, { title: 'Synced title', note: 'Synced note' })
  const week = boardOptions(source, { ...range, rangeStart: range.containerStart, rangeEnd: range.containerEnd })
  await client.fetchQuery(week)
  expect(client.getQueryData(week.queryKey)?.rangeTasks[0]).toMatchObject({ title: 'Pending title', note: 'Synced note' })
  await act(async () => { save.reject(new Error('Save failed')); await pending })
  expect(board().rangeTasks[0].title).toBe('Synced title')
  expect(client.getQueryData(week.queryKey)?.rangeTasks[0]).toMatchObject({ title: 'Synced title', note: 'Synced note' })
})

it('cancels an older in-flight read before reconciling saved fields', async () => {
  const task = await source.createTask({ title: 'Original', dayDate: range.today })
  const { client, result, board } = await mountActions()
  const oldRead = deferred<Task[]>()
  vi.spyOn(source, 'listTasksInRange').mockReturnValueOnce(oldRead.promise)
  const refresh = client.fetchQuery({ ...boardOptions(source, range), staleTime: 0 }).catch(() => {})
  await act(() => result.current.update(task.id, { title: 'Saved title' }))
  await act(async () => { oldRead.resolve([task]); await refresh })
  expect(board().rangeTasks[0].title).toBe('Saved title')
})

it('adds and removes reminder membership without reloading the board or recurring rules', async () => {
  const task = await source.createTask({ title: 'Task', dayDate: range.today })
  const { result, board, reports, services } = await mountActions()
  await act(() => result.current.changeReminder(task, '10:00', 'one'))
  expect(board().reminderTasks.map((item) => item.id)).toEqual([task.id])
  expect(reports()[0].reminderTime).toBe('10:00')
  await act(() => result.current.changeReminder(task, null, 'one'))
  expect(board().reminderTasks).toEqual([])
  expect(services.refresh).not.toHaveBeenCalled()
})

it('updates tags on overdue tasks in review and report caches without a full refresh', async () => {
  const tag = await source.createTag({ name: 'Work' })
  const task = await source.createTask({ title: 'Overdue', dayDate: '2026-10-26' })
  const { result, board, reports, services } = await mountActions()
  await act(() => result.current.toggleTag(task, tag.id))
  expect(board().leftUndone[0].tagIds).toEqual([tag.id])
  expect(reports()[0].tagIds).toEqual([tag.id])
  expect(services.refresh).not.toHaveBeenCalled()
})

it('preserves invalidations when applying optimistic and saved fields', async () => {
  const task = await source.createTask({ title: 'Task', dayDate: range.today })
  const { client, result, board } = await mountActions()
  await client.invalidateQueries({ queryKey: appKeys.tasks, refetchType: 'none' })
  const save = deferred<void>()
  const write = source.updateTask
  vi.spyOn(source, 'updateTask').mockImplementation(async (id, input) => { await save.promise; return write(id, input) })
  let pending!: Promise<Task | null>
  act(() => { pending = result.current.update(task.id, { note: 'Pending' }) })
  await waitFor(() => expect(board().rangeTasks[0].note).toBe('Pending'))
  expect(client.getQueryState(boardOptions(source, range).queryKey)?.isInvalidated).toBe(true)
  await act(async () => { save.resolve(); await pending })
  expect(client.getQueryState(boardOptions(source, range).queryKey)?.isInvalidated).toBe(true)
  expect(client.getQueryState(appKeys.reports)?.isInvalidated).toBe(true)
})
