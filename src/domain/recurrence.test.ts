import { describeRecurrence, occurrencesBetween } from './recurrence'
import type { RecurrenceKind, RecurringRule } from './types'

function makeRule(partial: Partial<RecurringRule>): RecurringRule {
  return {
    id: 'rule-1',
    title: 'Rule',
    tagIds: [],
    note: '',
    kind: 'weekly-on',
    reminderTime: null,
    weekday: null,
    dayOfMonth: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastRunDate: null,
    ...partial,
  }
}

describe('occurrencesBetween', () => {
  it('returns empty when start is after horizon', () => {
    expect(occurrencesBetween(makeRule({ kind: 'weekly-start' }), '2026-10-01', '2026-09-30', 1)).toEqual([])
  })

  it('generates weekly-on dates', () => {
    const out = occurrencesBetween(makeRule({ kind: 'weekly-on', weekday: 2 }), '2026-09-01', '2026-09-30', 1)
    expect(out.map((o) => o.date)).toEqual([
      '2026-09-01',
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      '2026-09-29',
    ])
  })

  it('generates monthly-on dates and clamps month lengths', () => {
    const out = occurrencesBetween(makeRule({ kind: 'monthly-on', dayOfMonth: 31 }), '2026-01-01', '2026-03-31', 1)
    expect(out.map((o) => o.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('generates weekly-start and monthly-start as rondeled items', () => {
    const weekly = occurrencesBetween(makeRule({ kind: 'weekly-start' }), '2026-09-15', '2026-09-30', 1)
    expect(weekly).toEqual([
      { date: '2026-09-21', dayDate: '2026-09-21', rondeled: true, bucket: null },
      { date: '2026-09-28', dayDate: '2026-09-28', rondeled: true, bucket: null },
    ])

    const monthly = occurrencesBetween(makeRule({ kind: 'monthly-start' }), '2026-09-15', '2026-11-30', 1)
    expect(monthly.map((o) => o.date)).toEqual(['2026-10-01', '2026-11-01'])
  })

  it('caps generated occurrences to protect against runaway loops', () => {
    const out = occurrencesBetween(makeRule({ kind: 'weekly-on', weekday: 1 }), '2020-01-01', '2030-01-01', 1)
    expect(out).toHaveLength(120)
  })
})

describe('describeRecurrence', () => {
  it('labels each supported recurrence kind', () => {
    expect(describeRecurrence('weekly-start', null, null)).toBe('Start of every week, rondeled into that week')
    expect(describeRecurrence('monthly-start', null, null)).toBe('Start of every month, rondeled into that month')
    expect(describeRecurrence('weekly-on', 5, null)).toBe('Every Friday')
    expect(describeRecurrence('monthly-on', null, 21)).toBe('Every 21st of the month')
  })

  it('handles unknown kinds defensively', () => {
    expect(describeRecurrence('unknown' as RecurrenceKind, null, null)).toBe('')
  })
})
