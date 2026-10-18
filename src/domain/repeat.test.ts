import { describeRepeat, repeatDatesBetween, repeatsOn } from './repeat'
import type { RepeatSpec } from './types'

const MON = 1
const spec = (fields: Partial<RepeatSpec>): RepeatSpec => ({ unit: 'day', every: 1, startDate: '2026-10-19', endDate: null, ...fields })
const dates = (s: RepeatSpec, from: string, to: string) => repeatDatesBetween(s, from, to, MON)

describe('repeat patterns', () => {
  it('every N days, from the start date, until the end date', () => {
    expect(dates(spec({ every: 3, endDate: '2026-10-28' }), '2026-10-01', '2026-11-30')).toEqual([
      '2026-10-19',
      '2026-10-22',
      '2026-10-25',
      '2026-10-28',
    ])
  })

  it('weekdays, weekends, and every 2 weeks on chosen days', () => {
    expect(dates(spec({ unit: 'week', weekdays: [1, 2, 3, 4, 5] }), '2026-10-23', '2026-10-27')).toEqual([
      '2026-10-23',
      '2026-10-26',
      '2026-10-27',
    ])
    expect(dates(spec({ unit: 'week', weekdays: [0, 6] }), '2026-10-19', '2026-10-25')).toEqual(['2026-10-24', '2026-10-25'])
    // Every other week on Mon + Thu, counted from the start week.
    expect(dates(spec({ unit: 'week', every: 2, weekdays: [1, 4] }), '2026-10-19', '2026-11-08')).toEqual([
      '2026-10-19',
      '2026-10-22',
      '2026-11-02',
      '2026-11-05',
    ])
  })

  it('monthly on a date (the 31st falls on the last day) or on the first/last weekday', () => {
    expect(dates(spec({ unit: 'month', monthly: { type: 'date', days: [31] }, startDate: '2026-01-31' }), '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
    expect(dates(spec({ unit: 'month', monthly: { type: 'weekday', nth: 1, weekday: MON } }), '2026-10-19', '2027-01-31')).toEqual([
      '2026-11-02',
      '2026-12-07',
      '2027-01-04',
    ])
    expect(dates(spec({ unit: 'month', monthly: { type: 'weekday', nth: -1, weekday: 5 } }), '2026-10-19', '2026-11-30')).toEqual([
      '2026-10-30',
      '2026-11-27',
    ])
  })

  it('monthly on several dates, like the 1st and 15th', () => {
    expect(dates(spec({ unit: 'month', monthly: { type: 'date', days: [15, 1] } }), '2026-10-01', '2026-11-30')).toEqual([
      '2026-11-01',
      '2026-11-15',
    ])
    expect(describeRepeat(spec({ unit: 'month', monthly: { type: 'date', days: [15, 1] } }))).toBe('Every month on the 1st, 15th')
  })

  it('every 3 months, and yearly (Feb 29 on Feb 28 in other years)', () => {
    expect(dates(spec({ unit: 'month', every: 3, monthly: { type: 'date', days: [19] } }), '2026-10-01', '2027-07-31')).toEqual([
      '2026-10-19',
      '2027-01-19',
      '2027-04-19',
      '2027-07-19',
    ])
    expect(dates(spec({ unit: 'year', startDate: '2028-02-29' }), '2028-01-01', '2030-12-31')).toEqual([
      '2028-02-29',
      '2029-02-28',
      '2030-02-28',
    ])
  })

  it('never repeats before the start date', () => {
    expect(repeatsOn(spec({}), '2026-10-18', MON)).toBe(false)
  })

  it('describes patterns in plain words', () => {
    expect(describeRepeat(spec({}))).toBe('Every day')
    expect(describeRepeat(spec({ unit: 'week', weekdays: [1, 2, 3, 4, 5] }))).toBe('Every weekday')
    expect(describeRepeat(spec({ unit: 'week', every: 2, weekdays: [4, 1] }))).toBe('Every 2 weeks on Mon, Thu')
    expect(describeRepeat(spec({ unit: 'month', monthly: { type: 'weekday', nth: 1, weekday: MON } }))).toBe('Every month on the first Monday')
    expect(describeRepeat(spec({ unit: 'month', every: 3, monthly: { type: 'date', days: [15] }, endDate: '2026-12-31' }))).toBe(
      'Every 3 months on the 15th until Dec 31',
    )
    expect(describeRepeat(spec({ unit: 'year' }))).toBe('Every year on Oct 19')
  })

})
