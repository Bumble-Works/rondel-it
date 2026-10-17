import {
  addDays,
  addMonths,
  dayTitle,
  endOfMonth,
  firstDayOfNextMonth,
  firstDayOfNextWeek,
  formatDayLabel,
  formatMonthLabel,
  formatShort,
  fromIso,
  isPast,
  isToday,
  nowInZone,
  relativeDayLabel,
  sameMonth,
  startOfMonth,
  startOfWeek,
  toIso,
  todayIso,
  weekdayName,
  weekDays,
} from './dates'

describe('dates helpers', () => {
  it('converts between Date and ISO', () => {
    const d = fromIso('2026-09-15')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(8)
    expect(d.getDate()).toBe(15)
    expect(toIso(new Date(2026, 8, 15))).toBe('2026-09-15')
  })

  it('computes today and relative day checks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-15T08:30:00.000Z'))
    const today = todayIso()
    expect(today).toBe('2026-09-15')
    expect(isToday(today)).toBe(true)
    expect(isPast('2026-09-14')).toBe(true)
    expect(isPast('2026-09-15')).toBe(false)
    expect(relativeDayLabel(today)).toBe('Today')
    expect(relativeDayLabel(addDays(today, 1))).toBe('Tomorrow')
    expect(relativeDayLabel(addDays(today, -1))).toBe('Yesterday')
    expect(relativeDayLabel(addDays(today, 2))).toBeNull()
    // Relative days also name the weekday; other days show just the weekday.
    const weekday = (iso: string) => weekdayName(fromIso(iso).getDay())
    expect(dayTitle(today)).toBe(`Today (${weekday(today)})`)
    expect(dayTitle(addDays(today, 1))).toBe(`Tomorrow (${weekday(addDays(today, 1))})`)
    expect(dayTitle(addDays(today, 3))).toBe(weekday(addDays(today, 3)))
    vi.useRealTimers()
  })

  it('handles day, week, and month arithmetic', () => {
    expect(addDays('2026-09-15', 3)).toBe('2026-09-18')
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
    expect(startOfWeek('2026-09-15', 1)).toBe('2026-09-14')
    expect(startOfWeek('2026-09-15', 0)).toBe('2026-09-13')
    expect(weekDays('2026-09-14')).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ])
    expect(addMonths('2026-01-31', 1)).toBe('2026-03-03')
    expect(startOfMonth('2026-09-21')).toBe('2026-09-01')
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28')
    expect(firstDayOfNextWeek('2026-09-15', 1)).toBe('2026-09-21')
    expect(firstDayOfNextMonth('2026-09-15')).toBe('2026-10-01')
    // The 31st must not overflow past the next month.
    expect(firstDayOfNextMonth('2026-01-31')).toBe('2026-02-01')
    expect(firstDayOfNextMonth('2026-10-31')).toBe('2026-11-01')
    expect(sameMonth('2026-09-01', '2026-09-30')).toBe(true)
    expect(sameMonth('2026-09-30', '2026-10-01')).toBe(false)
  })

  it('formats labels and weekday names', () => {
    expect(weekdayName(1)).toBe('Monday')
    expect(weekdayName(-1)).toBe('Saturday')
    expect(weekdayName(8)).toBe('Monday')
    expect(formatDayLabel('2026-09-15')).toBe('Tuesday, September 15')
    expect(formatShort('2026-09-15')).toBe('Sep 15')
    expect(formatMonthLabel('2026-09-15')).toBe('September 2026')
  })

  it('returns timezone date/time and uses fallback on formatter error', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-02T03:04:00.000Z'))
    expect(nowInZone('UTC')).toEqual({ date: '2026-01-02', time: '03:04' })

    const original = Intl.DateTimeFormat
    vi.stubGlobal(
      'Intl',
      {
        ...Intl,
        DateTimeFormat: () => {
          throw new Error('boom')
        },
      } as unknown as typeof Intl,
    )
    const fallback = nowInZone('Bad/Zone')
    expect(fallback.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(fallback.time).toMatch(/^\d{2}:\d{2}$/)
    vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: original } as unknown as typeof Intl)
    vi.useRealTimers()
  })
})
