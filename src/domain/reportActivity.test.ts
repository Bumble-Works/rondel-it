import { buildDashboard } from './reports'
import type { TaskRondel } from './types'
import { reportFixture, reportFixtureTask as task } from '../test/reportFixtures'

const tags = [{ id: 'work', name: 'Work', color: '#5486f5' }, { id: 'fitness', name: 'Fitness', color: '#16b98a' }]
const range = { start: '2026-10-19', end: '2026-10-21' }
const move: TaskRondel = { id: 'move', occurredAt: '2026-10-20T12:00:00Z', fromDate: '2026-10-20', toDate: '2026-11-02',
  fromRondeled: false, toRondeled: false, fromBucket: null, toBucket: null, status: 'todo' }

it('keeps a full leap-year timeline bounded to 366 dates and retains empty days', () => {
  const report = buildDashboard([], tags, { start: '2024-01-01', end: '2024-12-31' })
  expect(report.timeline).toHaveLength(366)
  expect(report.timeline.find((day) => day.date === '2024-02-29')).toEqual({ date: '2024-02-29', todo: 0, doing: 0, done: 0, canceled: 0, rondeled: 0 })
})

it('assigns each rondeled chain to exactly one current outcome, with doing never counted as still rondeled', () => {
  const report = reportFixture([
    task({ id: 'todo', rondelCount: 14, rondeled: true }),
    task({ id: 'old', status: 'doing', carriedToId: 'doing', rondelCount: 1 }),
    task({ id: 'doing', originTaskId: 'old', status: 'doing', rondeled: true, rondelCount: 2 }),
    task({ id: 'done', status: 'done', completedAt: '2026-10-21T12:00:00Z', rondelCount: 2 }),
    task({ id: 'canceled', status: 'canceled', dayDate: '2026-10-21', rondelCount: 1 }),
    task({ id: 'never-moved', status: 'done', completedAt: '2026-10-21T12:00:00Z' }),
  ])
  expect(report.rondels.outcomes).toEqual({ total: 4, todo: 1, doing: 1, done: 1, canceled: 1 })
})

it('counts created and first-actualized Bucket List ideas once, excluding parked work and repeat transfers', () => {
  const tasks = [
    task({ id: 'dream', dayDate: '2026-11-02', originDate: '2026-10-20', createdAt: '2026-10-19T12:00:00Z', bucketListOrigin: true,
      bucketHistory: [
        { id: 'created', kind: 'added', occurredAt: '2026-10-19T12:00:00Z' },
        { id: 'scheduled', kind: 'scheduled', occurredAt: '2026-10-20T12:00:00Z' },
        { id: 'back', kind: 'added', occurredAt: '2026-10-21T12:00:00Z' },
        { id: 'later', kind: 'scheduled', occurredAt: '2026-10-22T12:00:00Z' },
      ] }),
    task({ id: 'legacy-dream', dayDate: null, originDate: null, createdAt: '2026-10-19T12:00:00Z', bucket: 'bucket-list', bucketListOrigin: true }),
    task({ id: 'parked', bucket: 'bucket-list', dayDate: null, bucketListOrigin: false,
      bucketHistory: [{ id: 'parked-added', kind: 'added', occurredAt: move.occurredAt }],
      rondelCount: 1, rondelHistory: [{ ...move, toDate: null, toBucket: 'bucket-list' }] }),
  ]
  const original = structuredClone(tasks)
  expect(buildDashboard(tasks, tags, range).bucketActivity).toEqual({ created: 2, actualized: 1 })
  expect(tasks).toEqual(original)
})

it('deduplicates bucket events across a chain and applies its current tags with any/all matching', () => {
  const events = [
    { id: 'added', kind: 'added' as const, occurredAt: '2026-10-19T12:00:00Z' },
    { id: 'scheduled', kind: 'scheduled' as const, occurredAt: '2026-10-20T12:00:00Z' },
  ]
  const tasks = [
    task({ id: 'old', status: 'doing', createdAt: events[0].occurredAt, bucketListOrigin: true, bucketHistory: events, tagIds: ['fitness'], carriedToId: 'live' }),
    task({ id: 'live', originTaskId: 'old', bucketListOrigin: true, createdAt: '2026-10-21T12:00:00Z', bucketHistory: events, tagIds: ['work'] }),
  ]
  expect(buildDashboard(tasks, tags, range, { tagIds: ['work'] }).bucketActivity).toEqual({ created: 1, actualized: 1 })
  expect(buildDashboard(tasks, tags, range, { tagIds: ['fitness'] }).bucketActivity).toEqual({ created: 0, actualized: 0 })
  expect(buildDashboard(tasks, tags, range, { tagIds: ['work', 'fitness'], tagMatch: 'any' }).bucketActivity).toEqual({ created: 1, actualized: 1 })
  expect(buildDashboard(tasks, tags, range, { tagIds: ['work', 'fitness'], tagMatch: 'all' }).bucketActivity).toEqual({ created: 0, actualized: 0 })
})

it('uses a genuine legacy Bucket List idea’s retained scheduled day without counting parked work', () => {
  const report = buildDashboard([
    task({ id: 'parked', dayDate: null, bucket: 'bucket-list', rondelCount: 1,
      rondelHistory: [{ ...move, toDate: null, toBucket: 'bucket-list' }] }),
    task({ id: 'scheduled-legacy', originDate: '2026-10-20', dayDate: '2026-10-21', bucketListOrigin: true, createdAt: '2026-09-01T12:00:00Z' }),
  ], tags, range)
  expect(report.bucketActivity).toEqual({ created: 0, actualized: 1 })
})
