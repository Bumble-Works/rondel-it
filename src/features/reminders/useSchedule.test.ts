import { renderHook } from '@testing-library/react'
import type { Task, UserSetting } from '../../domain/types'
import { useSchedule } from './useSchedule'

const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../../shared/notify', () => ({ notify }))

const settings = { weekStartDay: 1, dayStartTime: '09:00', endOfDayTime: '17:00', timezone: 'UTC' } as UserSetting
const reminder = { id: 'call', title: 'Call the bank', dayDate: '2026-10-19', reminderTime: '10:30' } as Task

describe('useSchedule', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 19, 10, 29)) // Mon 10:29 local
    notify.mockClear()
  })

  it('notifies at the reminder time, runs review times and the new day, and never repeats', () => {
    const onReview = vi.fn()
    const onNewDay = vi.fn()
    const { unmount } = renderHook(() => useSchedule({ reminders: [reminder], settings, onReview, onNewDay }))
    expect(onReview).not.toHaveBeenCalled() // 09:00 had passed when the app opened

    vi.advanceTimersByTime(60_000) // 10:30
    expect(notify).toHaveBeenCalledWith('Rondel It reminder', 'Call the bank')

    vi.setSystemTime(new Date(2026, 9, 19, 16, 59, 59))
    vi.advanceTimersByTime(60 * 60 * 1000) // timers re-plan at least hourly → past 17:00
    expect(onReview).toHaveBeenCalledWith('end')

    vi.setSystemTime(new Date(2026, 9, 19, 23, 59, 59))
    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(onNewDay).toHaveBeenCalledTimes(1)
    unmount()

    // Reopening the app the same day doesn't notify the same reminder again.
    vi.setSystemTime(new Date(2026, 9, 19, 11, 0))
    notify.mockClear()
    renderHook(() => useSchedule({ reminders: [reminder], settings, onReview, onNewDay }))
    expect(notify).not.toHaveBeenCalled()
  })

  it('catches up a reminder missed earlier today while the app was closed', () => {
    vi.setSystemTime(new Date(2026, 9, 19, 12, 0))
    renderHook(() => useSchedule({ reminders: [reminder], settings, onReview: () => {}, onNewDay: () => {} }))
    expect(notify).toHaveBeenCalledWith('Rondel It reminder', 'Call the bank')
  })
})
