import { buildDashboard, groupLineage } from './reports'
import { calendarDays, recordedDate } from './reportDates'
import type { Task, TaskRondel } from './types'

const october = { start: '2026-10-01', end: '2026-10-31' }
const today = '2026-10-25'
const tags = [{ id: 'work', name: 'Work', color: '#3366ff' }, { id: 'home', name: 'Home', color: '#ff6633' }]

function task(fields: Partial<Task> = {}): Task {
  return {
    id: 'one', title: 'A task', note: '', status: 'todo', dayDate: '2026-10-10',
    rondeled: false, bucket: null, position: 0, rondelCount: 0, doingRondelCount: 0,
    startedAt: null, canceledAt: null, bucketListOrigin: false, rondelHistory: [],
    flagged: false, reminderTime: null, tagIds: [], createdAt: '2026-10-01T12:00:00',
    completedAt: null, recurringRuleId: null, originDate: '2026-10-01',
    originTaskId: null, previousTaskId: null, carriedToId: null, ...fields,
  }
}

function event(fields: Partial<TaskRondel> = {}): TaskRondel {
  return {
    id: 'move', occurredAt: '2026-10-25T12:00:00', fromDate: '2026-10-20', toDate: '2026-11-01',
    fromRondeled: false, toRondeled: true, fromBucket: null, toBucket: null, status: 'todo', ...fields,
  }
}

function dashboard(tasks: Task[]) {
  return buildDashboard(tasks, tags, october, {}, today)
}

describe('report population and identity', () => {
  it('counts legacy and recorded cancellations consistently through any/all tag filters without writing dates', () => {
    const tasks = [
      task({ id: 'legacy-work', status: 'canceled', dayDate: '2026-10-26', tagIds: ['work'] }),
      task({ id: 'home', status: 'canceled', dayDate: '2026-11-02', canceledAt: '2026-10-26T12:00:00', tagIds: ['home'] }),
      task({ id: 'both', status: 'canceled', canceledAt: '2026-10-25T12:00:00', tagIds: ['work', 'home'] }),
      task({ id: 'outside', status: 'canceled', originDate: '2026-09-01', dayDate: '2026-10-26', canceledAt: '2026-09-30T12:00:00', tagIds: ['work'] }),
    ]
    const filtered = (tagIds: string[], tagMatch: 'any' | 'all' = 'any') =>
      buildDashboard(tasks, tags, october, { tagIds, tagMatch, includeCanceled: true }, today)
    expect(filtered([]).activity.canceled).toBe(3)
    expect(filtered(['work']).activity.canceled).toBe(2)
    expect(filtered(['home']).activity.canceled).toBe(2)
    expect(filtered(['work', 'home']).activity.canceled).toBe(3)
    expect(filtered(['work', 'home'], 'all').activity.canceled).toBe(1)
    expect(filtered(['missing']).activity.canceled).toBe(0)
    expect(filtered(['work']).rows.find((row) => row.id === 'legacy-work')).toMatchObject({ canceledDate: '2026-10-26', tagIds: ['work'] })
    expect(tasks[0].canceledAt).toBeNull()
  })

  it('attributes a canceled chain to its current tags rather than an old history copy', () => {
    const tasks = [
      task({ id: 'old', status: 'doing', tagIds: ['home'], carriedToId: 'live' }),
      task({ id: 'live', originTaskId: 'old', status: 'canceled', dayDate: '2026-10-26', tagIds: ['work'] }),
    ]
    const filtered = (tagIds: string[]) => buildDashboard(tasks, tags, october, { tagIds, includeCanceled: true }, today)
    expect(filtered(['work']).activity.canceled).toBe(1)
    expect(filtered(['work']).rows).toHaveLength(1)
    expect(filtered(['home']).activity.canceled).toBe(0)
    expect(filtered(['home']).rows).toHaveLength(0)
  })

  it('identifies left-behind todos without including doing, containers, history, or work already moved forward', () => {
    const report = buildDashboard([
      task({ id: 'left', tagIds: ['work'], dayDate: '2026-10-24' }),
      task({ id: 'today', dayDate: today }),
      task({ id: 'future', dayDate: '2026-10-26' }),
      task({ id: 'doing', status: 'doing', dayDate: '2026-10-24' }),
      task({ id: 'waiting', rondeled: true, dayDate: '2026-10-24', rondelCount: 1 }),
      task({ id: 'bucket', dayDate: null, bucket: 'bucket-list' }),
      task({ id: 'old', status: 'doing', dayDate: '2026-10-20', carriedToId: 'live' }),
      task({ id: 'live', originTaskId: 'old', dayDate: '2026-11-02', rondelCount: 1 }),
    ], tags, october, {}, today)
    expect(report.leftBehindIds).toEqual(['left'])
    expect(buildDashboard([task({ id: 'left', tagIds: ['work'] })], tags, october, { tagIds: ['home'] }, today).leftBehindIds).toEqual([])
  })

  it('uses saved day entries for status charts and recorded completion dates for the completion calendar', () => {
    const report = dashboard([
      task({ id: 'scheduled', status: 'done', completedAt: '2026-11-01T12:00:00' }),
      task({ id: 'completed', status: 'done', dayDate: '2026-09-30', completedAt: '2026-10-02T12:00:00' }),
      task({ id: 'active' }),
      task({ id: 'container', rondeled: true }),
      task({ id: 'bucket', bucket: 'bucket-list', dayDate: null }),
    ])
    expect(report.summary).toMatchObject({ total: 2, todo: 1, doing: 0, done: 1, completionRate: 50 })
    expect(report.completedCount).toBe(1)
    expect(report.completions).toEqual([{ day: '2026-10-02', value: 1 }])
    expect(report.rows.map((row) => row.id).sort()).toEqual(['active', 'completed', 'scheduled'])
  })

  it('counts a carried lineage once in Tasks and its saved entries separately in status charts', () => {
    const tasks = [
      task({ id: 'original', status: 'doing', carriedToId: 'copy', rondelCount: 1 }),
      task({ id: 'copy', originTaskId: 'original', previousTaskId: 'original', rondelCount: 2 }),
      task({ id: 'repeat-1', recurringRuleId: 'rule' }),
      task({ id: 'repeat-2', recurringRuleId: 'rule' }),
    ]
    const report = dashboard(tasks)
    expect(groupLineage(tasks)).toHaveLength(3)
    expect(report.summary.total).toBe(4)
    expect(report.rows).toHaveLength(3)
    expect(report.rondels.total).toBe(2)
  })

  it('keeps cancellations separate from the completion denominator and optionally shows their details', () => {
    const tasks = [task(), task({ id: 'cancel', status: 'canceled', canceledAt: '2026-10-12T12:00:00' })]
    expect(dashboard(tasks).summary).toMatchObject({ total: 1, canceled: 1, completionRate: 0 })
    expect(dashboard(tasks).rows).toHaveLength(1)
    const included = buildDashboard(tasks, tags, october, { includeCanceled: true }, today)
    expect(included.rows).toHaveLength(2)
    expect(included.review[0].items[0].status).toBe('canceled')
    expect(included.summary.total).toBe(1)
  })

  it('filters and attributes a whole lineage by its latest tags with any or all matching', () => {
    const tasks = [
      task({ id: 'old', status: 'doing', carriedToId: 'new', tagIds: ['work'] }),
      task({ id: 'new', originTaskId: 'old', tagIds: ['home'], rondelCount: 1 }),
      task({ id: 'both', tagIds: ['work', 'home'], status: 'done', completedAt: '2026-10-12T12:00:00' }),
    ]
    const any = buildDashboard(tasks, tags, october, { tagIds: ['work', 'home'], tagMatch: 'any' }, today)
    const all = buildDashboard(tasks, tags, october, { tagIds: ['work', 'home'], tagMatch: 'all' }, today)
    expect(any.rows).toHaveLength(2)
    expect(all.rows.map((row) => row.id)).toEqual(['both'])
    const work = any.tagMetrics.find((tag) => tag.id === 'work')!
    expect(work).toMatchObject({ total: 1, done: 1, rondels: 0 })
    expect(any.tagMetrics.find((tag) => tag.id === 'home')).toMatchObject({ total: 3, inProgress: 1, done: 1, rondels: 1 })
  })
})

describe('period carry-forward flows', () => {
  it('counts period rondels by decision date, including repeated decisions and deduplicated chain events', () => {
    const moves = [
      event({ id: 'before', occurredAt: '2026-09-30T12:00:00', fromDate: '2026-10-01', toDate: '2026-10-02' }),
      event({ id: 'first', occurredAt: '2026-10-01T12:00:00', fromDate: '2026-11-01', toDate: '2026-11-02' }),
      event({ id: 'last', occurredAt: '2026-10-31T12:00:00', fromDate: '2026-10-30', toDate: '2026-11-05' }),
      event({ id: 'after', occurredAt: '2026-11-01T12:00:00', fromDate: '2026-10-20', toDate: '2026-10-21' }),
    ]
    const report = dashboard([
      task({ id: 'old', status: 'doing', carriedToId: 'live', rondelHistory: moves }),
      task({ id: 'live', originTaskId: 'old', dayDate: '2026-11-05', rondelCount: 4, rondelHistory: moves }),
    ])
    expect(report.activity.rondeled).toBe(2)
    expect(report.rondels.total).toBe(4)
    expect(report.rondels.flow.within).toEqual({ tasks: 1, decisions: 2 })
    expect(report.rondels.flow.outgoing).toEqual({ tasks: 1, decisions: 1 })
    expect(report.rows).toHaveLength(1)
  })

  it('includes decisions made in the period even when both scheduled dates are in the future', () => {
    const report = dashboard([task({ originDate: '2026-11-01', dayDate: '2026-11-02', rondelCount: 1,
      rondelHistory: [event({ fromDate: '2026-11-01', toDate: '2026-11-02' })] })])
    expect(report.rows).toHaveLength(1)
    expect(report.activity.rondeled).toBe(1)
    expect(report.rondels.flow.outgoing.tasks).toBe(0)
  })

  it('counts current doing chains even after they move beyond the period and applies tag filters', () => {
    const tasks = [
      task({ id: 'old', status: 'doing', carriedToId: 'work' }),
      task({ id: 'work', originTaskId: 'old', status: 'doing', dayDate: '2026-11-02', tagIds: ['work'], rondelCount: 1 }),
      task({ id: 'home', status: 'doing', tagIds: ['home'] }),
      task({ id: 'reopened', status: 'todo', startedAt: '2026-10-01T12:00:00' }),
      task({ id: 'done', status: 'done', completedAt: '2026-10-25T12:00:00' }),
      task({ id: 'cancel', status: 'canceled', canceledAt: '2026-10-25T12:00:00' }),
    ]
    expect(dashboard(tasks).activity.doing).toBe(2)
    expect(buildDashboard(tasks, tags, october, { tagIds: ['work'] }).activity.doing).toBe(1)
    expect(buildDashboard(tasks, tags, october, { tagIds: ['work', 'home'], tagMatch: 'all' }).activity.doing).toBe(0)
  })

  it('retains October todos carried to November even though no task remains scheduled in October', () => {
    const report = dashboard([task({ dayDate: '2026-11-01', rondeled: true, rondelCount: 1, rondelHistory: [event()] })])
    expect(report.summary).toMatchObject({ total: 0, todo: 0, done: 0 })
    expect(report.rondels.flow.outgoing).toEqual({ tasks: 1, decisions: 1 })
    expect(report.rows[0].flows[0]).toMatchObject({ direction: 'outgoing', toDate: '2026-11-01' })
  })

  it('counts incoming, within and outgoing decisions by schedule dates rather than the decision timestamp', () => {
    const report = dashboard([task({
      dayDate: null, bucket: 'bucket-list', rondelCount: 3,
      rondelHistory: [
        event({ id: 'in', fromDate: '2026-09-30', toDate: '2026-10-01', occurredAt: '2026-09-20T12:00:00' }),
        event({ id: 'within', fromDate: '2026-10-01', toDate: '2026-10-20' }),
        event({ id: 'out', fromDate: '2026-10-20', toDate: null, toBucket: 'bucket-list' }),
      ],
    })])
    expect(report.rondels.flow).toEqual({
      incoming: { tasks: 1, decisions: 1 }, within: { tasks: 1, decisions: 1 }, outgoing: { tasks: 1, decisions: 1 },
    })
    expect(report.rows).toHaveLength(1)
  })

  it('distinguishes unique tasks from decisions and deduplicates event IDs across history records', () => {
    const first = event({ id: 'first', fromDate: '2026-10-20', toDate: '2026-11-01', status: 'doing' })
    const second = event({ id: 'second', fromDate: '2026-10-25', toDate: '2026-11-02', status: 'doing' })
    const report = dashboard([
      task({ id: 'old', status: 'doing', carriedToId: 'new', rondelHistory: [first] }),
      task({ id: 'new', originTaskId: 'old', dayDate: '2026-11-02', rondelCount: 2, rondelHistory: [first, second] }),
    ])
    expect(report.rondels.flow.outgoing).toEqual({ tasks: 1, decisions: 2 })
    expect(report.coverage.partialHistory).toBe(0)
  })

  it('does not invent legacy move dates or attribute unknown rondels to todo', () => {
    const report = dashboard([task({ rondelCount: 5, doingRondelCount: null, rondelHistory: [] })])
    expect(report.rondels).toMatchObject({ total: 5, todo: 0, doing: 0, unknown: 5 })
    expect(report.rondels.flow.outgoing.decisions).toBe(0)
    expect(report.activity.rondeled).toBe(0)
    expect(report.coverage).toMatchObject({ partialHistory: 1, unknownRondelSplit: 1 })
  })
})

describe('elapsed days and review evidence', () => {
  it('calculates both duration measures and excludes missing or negative dates with coverage', () => {
    const report = dashboard([
      task({ id: 'known', status: 'done', originDate: '2026-10-01', startedAt: '2026-10-04T12:00:00', completedAt: '2026-10-06T12:00:00' }),
      task({ id: 'same-day', status: 'done', originDate: '2026-10-06', startedAt: '2026-10-06T09:00:00', completedAt: '2026-10-06T12:00:00' }),
      task({ id: 'missing', status: 'done', originDate: null, startedAt: null, completedAt: '2026-10-06T12:00:00' }),
      task({ id: 'negative', status: 'done', originDate: '2026-10-07', startedAt: '2026-10-07T12:00:00', completedAt: '2026-10-06T12:00:00' }),
    ])
    expect(report.durations.planned).toMatchObject({ values: [0, 5], average: 2.5, median: 2.5, available: 2, total: 4 })
    expect(report.durations.started).toMatchObject({ values: [0, 2], average: 1, available: 2, total: 4 })
    expect(report.coverage.missingStarted).toBe(2)
  })

  it('uses local calendar dates and counts calendar boundaries independently of DST day length', () => {
    expect(recordedDate('2026-10-25T23:30:00')).toBe('2026-10-25')
    expect(calendarDays('2026-03-07', '2026-03-09')).toBe(2)
    expect(calendarDays('2026-02-30', '2026-03-03')).toBeNull()
  })

  it('lists only dated doing/history and completion evidence, never intervening work days', () => {
    const report = dashboard([
      task({ id: 'old', status: 'doing', dayDate: '2026-10-10', carriedToId: 'live', note: 'Initial attempt' }),
      task({ id: 'live', originTaskId: 'old', dayDate: '2026-10-20', status: 'doing', startedAt: '2026-10-10T12:00:00', rondelCount: 1 }),
    ])
    expect(report.review.map((day) => day.date)).toEqual(['2026-10-10', '2026-10-20'])
    expect(report.review[0].items[0]).toMatchObject({ carriedForward: true, note: 'Initial attempt' })
    expect(report.rows[0].inProgressDays).toBe(15)
  })

  it('celebrates only proven Bucket List origins completed in the selected period', () => {
    const report = dashboard([
      task({ id: 'dream', status: 'done', bucketListOrigin: true, completedAt: '2026-10-12T12:00:00' }),
      task({ id: 'unknown', status: 'done', bucketListOrigin: null, completedAt: '2026-10-12T12:00:00' }),
      task({ id: 'ordinary', status: 'done', bucketListOrigin: false, completedAt: '2026-10-12T12:00:00' }),
    ])
    expect(report.bucketCompletions.map((row) => row.id)).toEqual(['dream'])
    expect(report.coverage.unknownBucketOrigin).toBe(1)
  })

  it('does not retain a completion after reopening and keeps first-start elapsed days', () => {
    const report = dashboard([task({ status: 'todo', completedAt: null, startedAt: '2026-10-05T12:00:00' })])
    expect(report.completedCount).toBe(0)
    expect(report.rows[0]).toMatchObject({ startedDays: null, inProgressDays: 20 })
  })

  it('returns empty usable metrics and rejects invalid custom ranges', () => {
    const report = dashboard([])
    expect(report.summary.completionRate).toBeNull()
    expect(report.durations.started.average).toBeNull()
    expect(report.rows).toEqual([])
    expect(() => buildDashboard([], [], { start: '2026-10-20', end: '2026-10-01' })).toThrow('start on or before')
  })

  it('rejects multi-year calculations even when called directly without the range selector', () => {
    expect(() => buildDashboard([], [], { start: '2025-01-01', end: '2026-01-01' }))
      .toThrow('no more than one year')
    expect(buildDashboard([], [], { start: '2024-01-01', end: '2024-12-31' }).summary.total).toBe(0)
  })
})
