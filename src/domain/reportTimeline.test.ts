import { buildDashboard } from './reports'
import { reportFixtureTask as task } from '../test/reportFixtures'
import type { TaskRondel } from './types'

const week = { start: '2026-10-25', end: '2026-10-31' }
const today = '2026-10-27'
const tags = [{ id: 'work', name: 'Work', color: '#5486f5' }]

it('shows only the entries saved on each day, keeping empty Saturdays empty and busy days visible', () => {
  const report = buildDashboard([
    task({ id: 'doing', status: 'doing', dayDate: today, startedAt: '2026-10-25T12:00:00Z' }),
    task({ id: 'todo', dayDate: '2026-10-28' }),
    task({ id: 'another-todo', dayDate: '2026-10-28' }),
    task({ id: 'done', status: 'done', dayDate: '2026-10-28', completedAt: '2026-10-29T12:00:00Z' }),
    task({ id: 'canceled', status: 'canceled', dayDate: '2026-10-30', canceledAt: '2026-10-31T12:00:00Z' }),
    task({ id: 'past', dayDate: '2026-10-24' }),
    task({ id: 'future', dayDate: '2026-11-01', status: 'doing' }),
    task({ id: 'waiting', dayDate: '2026-10-28', rondeled: true }),
    task({ id: 'bucket', dayDate: null, bucket: 'bucket-list' }),
  ], tags, week, {}, today)
  expect(report.timeline.map(({ todo, doing, done, canceled }) => [todo, doing, done, canceled])).toEqual([
    [0, 0, 0, 0], [0, 0, 0, 0], [0, 1, 0, 0], [2, 0, 1, 0],
    [0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 0],
  ])
  expect(report.summary).toMatchObject({ total: 4, todo: 2, doing: 1, done: 1, canceled: 1 })
  // The task table still finds unfinished work across the period without assigning it to every day.
  expect(report.rows.find((row) => row.id === 'future')).toBeDefined()
})

it('retains actual doing copies on their saved days without inventing entries between a chain’s copies', () => {
  const report = buildDashboard([
    task({ id: 'old', status: 'doing', dayDate: '2026-10-25', carriedToId: 'live', tagIds: [] }),
    task({ id: 'live', status: 'done', dayDate: '2026-10-29', originTaskId: 'old', previousTaskId: 'old',
      completedAt: '2026-10-30T12:00:00Z', rondelCount: 1, tagIds: ['work'] }),
  ], tags, week, { tagIds: ['work'] }, today)
  expect(report.timeline.map((day) => day.doing)).toEqual([1, 0, 0, 0, 0, 0, 0])
  expect(report.timeline.map((day) => day.done)).toEqual([0, 0, 0, 0, 1, 0, 0])
  expect(report.tagMetrics[0]).toMatchObject({ total: 2, inProgress: 1, done: 1, todo: 0, rondels: 1 })
  expect(report.rows).toHaveLength(1)
})

it('counts recorded rondel decisions on their local action date, without inferring days from source or destination', () => {
  const move: TaskRondel = { id: 'move', occurredAt: '2026-10-27T12:00:00', fromDate: '2026-10-01', toDate: '2026-11-02',
    fromRondeled: false, toRondeled: false, fromBucket: null, toBucket: null, status: 'doing' }
  const report = buildDashboard([
    task({ id: 'old', status: 'doing', dayDate: '2026-10-01', carriedToId: 'live', rondelHistory: [move] }),
    task({ id: 'live', status: 'doing', dayDate: '2026-11-02', originTaskId: 'old', rondelCount: 2,
      rondelHistory: [move, { ...move, id: 'second', fromDate: '2026-11-02', toDate: '2026-11-03' }] }),
    task({ id: 'undated', dayDate: '2026-11-03', rondelCount: 14 }),
  ], [], week, {}, today)
  expect(report.timeline.map((day) => day.rondeled)).toEqual([0, 0, 2, 0, 0, 0, 0])
  expect(report.timeline.every((day) => day.todo === 0 && day.doing === 0)).toBe(true)
  expect(report.summary.total).toBe(0)
})
