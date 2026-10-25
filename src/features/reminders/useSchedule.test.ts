import { renderHook } from '@testing-library/react'
import type { Task, UserSetting } from '../../domain/types'
import { useSchedule } from './useSchedule'

const settings = { weekStartDay: 1, dayStartTime: '09:00', endOfDayTime: '17:00', timezone: 'UTC' } as UserSetting
const reminder = { id: 'call', title: 'Call the bank', dayDate: '2026-10-19', reminderTime: '10:30' } as Task

describe('useSchedule', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 19, 10, 29)) // Mon 10:29 local
  })

  it('fires the reminder on time, runs review times and the new day, and never repeats', () => {
    const onReminder = vi.fn()
    const onReview = vi.fn()
    const onNewDay = vi.fn()
    const { unmount } = renderHook(() => useSchedule({ reminders: [reminder], settings, onReminder, onReview, onNewDay }))
    expect(onReview).toHaveBeenCalledWith('start') // 09:00 had passed when the app opened

    vi.advanceTimersByTime(60_000) // 10:30
    expect(onReminder).toHaveBeenCalledWith(reminder)

    vi.setSystemTime(new Date(2026, 9, 19, 16, 59, 59))
    vi.advanceTimersByTime(60 * 60 * 1000) // timers re-plan at least hourly → past 17:00
    expect(onReview).toHaveBeenCalledWith('end')

    vi.setSystemTime(new Date(2026, 9, 19, 23, 59, 59))
    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(onNewDay).toHaveBeenCalledTimes(1)
    unmount()

    // Reopening the app the same day doesn't fire the same reminder again.
    vi.setSystemTime(new Date(2026, 9, 19, 11, 0))
    onReminder.mockClear()
    renderHook(() => useSchedule({ reminders: [reminder], settings, onReminder, onReview, onNewDay }))
    expect(onReminder).not.toHaveBeenCalled()
  })

  it('catches up a reminder missed earlier today while the app was closed', () => {
    vi.setSystemTime(new Date(2026, 9, 19, 12, 0))
    const onReminder = vi.fn()
    renderHook(() => useSchedule({ reminders: [reminder], settings, onReminder, onReview: () => {}, onNewDay: () => {} }))
    expect(onReminder).toHaveBeenCalledWith(reminder)
  })

  it('catches up a missed morning review once on open, but not end-of-day before its time', () => {
    vi.setSystemTime(new Date(2026, 9, 19, 14, 0))
    const onReview = vi.fn()
    renderHook(() =>
      useSchedule({ reminders: [], settings, onReminder: () => {}, onReview, onNewDay: () => {} }),
    )

    expect(onReview).toHaveBeenCalledTimes(1)
    expect(onReview).toHaveBeenCalledWith('start')
    expect(onReview).not.toHaveBeenCalledWith('end')
  })
})
