import { act, renderHook } from '@testing-library/react'
import type { Task } from '../../domain/types'
import { useReminderAlerts } from './useReminderAlerts'

const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../../shared/notify', () => ({ notify }))

const call = { id: 'call', title: 'Call the bank', dayDate: '2026-10-19', reminderTime: '12:30' } as Task
const other = { id: 'other', title: 'Water plants', dayDate: '2026-10-19', reminderTime: '12:30' } as Task

function setup(reminderTasks: Task[] = [call, other]) {
  const actions = { onSnooze: vi.fn(), onSetDone: vi.fn(), onRondel: vi.fn() }
  const hook = renderHook((tasks: Task[]) => useReminderAlerts({ reminderTasks: tasks, weekStartDay: 1, ...actions }), {
    initialProps: reminderTasks,
  })
  return { ...hook, actions }
}

describe('useReminderAlerts (browser)', () => {
  beforeEach(() => notify.mockClear())

  it('pops up a reminder when it goes off, and notifies', () => {
    const { result } = setup()
    expect(result.current.modal.open).toBe(false)
    act(() => result.current.add(call))
    expect(result.current.modal).toMatchObject({ open: true, tasks: [call] })
    expect(notify).toHaveBeenCalledWith('Rondel It reminder', 'Call the bank')
  })

  it('snoozes 10 minutes from now, and lets that reminder go', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 12, 30))
    const { result, actions } = setup()
    act(() => {
      result.current.add(call)
      result.current.add(other)
    })
    act(() => result.current.modal.onAct(call, { kind: 'snooze' }))
    expect(actions.onSnooze).toHaveBeenCalledWith(call, '12:40')
    expect(result.current.modal.tasks).toEqual([other])
  })

  it('marks done or reschedules, and closes when none are left', () => {
    const { result, actions } = setup()
    act(() => {
      result.current.add(call)
      result.current.add(other)
    })
    act(() => result.current.modal.onAct(call, { kind: 'done' }))
    expect(actions.onSetDone).toHaveBeenCalledWith(call)
    act(() => result.current.modal.onAct(other, { kind: 'reschedule', target: { toDate: '2026-10-20' } }))
    expect(actions.onRondel).toHaveBeenCalledWith(other, { toDate: '2026-10-20' })
    expect(result.current.modal.open).toBe(false)
  })

  it('drops a reminder whose task was finished or deleted elsewhere', () => {
    const { result, rerender } = setup()
    act(() => result.current.add(call))
    rerender([other])
    expect(result.current.modal.open).toBe(false)
  })
})
