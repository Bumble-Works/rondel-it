import { buildDashboard } from './reports'
import { reportFixtureTask as task } from '../test/reportFixtures'

const tags = [{ id: 'fitness', name: 'Fitness', color: '#16b98a' }]
const week = { start: '2026-10-19', end: '2026-10-25' }

describe('task lifetime in reports', () => {
  it('retains an unstarted task across every period it was open, even without legacy move history', () => {
    const pilates = task({ id: 'pilates', title: 'Pilates', originDate: '2026-10-01', dayDate: '2026-11-02',
      tagIds: ['fitness'], rondelCount: 14, doingRondelCount: null, rondeled: true })
    for (const range of [week, { start: '2026-10-01', end: '2026-10-07' }, { start: '2026-10-12', end: '2026-10-18' }]) {
      const report = buildDashboard([pilates], tags, range)
      expect(report.rows).toHaveLength(1)
      expect(report.rows[0]).toMatchObject({ firstSeenDate: '2026-10-14', rondelCount: 14, inProgressDays: null })
      expect(report.tagMetrics[0]).toMatchObject({ done: 0, todo: 0, rondels: 14 })
      expect(report.rondels.flow.outgoing.decisions).toBe(0)
    }
  })

  it('ends relevance at completion or cancellation and includes both boundary dates', () => {
    const tasks = [
      task({ id: 'done', status: 'done', originDate: '2026-10-19', dayDate: '2026-11-02', completedAt: '2026-10-25T12:00:00Z' }),
      task({ id: 'cancel', status: 'canceled', originDate: '2026-10-19', dayDate: '2026-11-02', canceledAt: '2026-10-25T12:00:00Z' }),
    ]
    const report = (start: string, end: string) => buildDashboard(tasks, tags, { start, end }, { includeCanceled: true })
    expect(report('2026-10-19', '2026-10-19').rows).toHaveLength(2)
    expect(report('2026-10-25', '2026-10-25').rows).toHaveLength(2)
    expect(report('2026-10-26', '2026-10-31').rows).toHaveLength(0)
    expect(report('2026-10-01', '2026-10-18').rows).toHaveLength(0)
  })

  it('does not treat an unscheduled dream or a waiting first-time plan as active work', () => {
    const report = buildDashboard([
      task({ id: 'dream', originDate: null, dayDate: null, bucket: 'bucket-list' }),
      task({ id: 'waiting', originDate: '2026-10-19', dayDate: '2026-10-19', rondeled: true }),
      task({ id: 'future', originDate: '2026-11-02', dayDate: '2026-11-02' }),
    ], tags, week)
    expect(report.rows).toHaveLength(0)
  })

  it('does not revive early-completed work on its later scheduled day, but preserves missing legacy resolution dates', () => {
    const tasks = [
      task({ id: 'finished-early', status: 'done', originDate: '2026-10-01', dayDate: '2026-10-27', completedAt: '2026-10-25T12:00:00Z' }),
      task({ id: 'unknown-finish', status: 'done', originDate: '2026-10-01', dayDate: '2026-10-27' }),
    ]
    const report = buildDashboard(tasks, tags, { start: '2026-10-26', end: '2026-10-31' })
    expect(report.rows.map((row) => row.id)).toEqual(['unknown-finish'])
  })

  it('takes the earliest retained creation date from the chain and counts the live task once', () => {
    const report = buildDashboard([
      task({ id: 'old', status: 'doing', dayDate: '2026-10-05', originDate: '2026-10-03', createdAt: '2026-10-02T12:00:00Z', carriedToId: 'live' }),
      task({ id: 'live', status: 'doing', originTaskId: 'old', originDate: '2026-10-14', dayDate: '2026-11-02', tagIds: ['fitness'], rondelCount: 3 }),
    ], tags, week)
    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]).toMatchObject({ id: 'live', firstSeenDate: '2026-10-02' })
    expect(report.tagMetrics[0]).toMatchObject({ inProgress: 0, rondels: 3 })
  })
})
