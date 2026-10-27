import { reportFixture, reportFixtureTask as task } from '../test/reportFixtures'

describe('report start estimates', () => {
  it('estimates legacy completed and active work without changing saved tasks or recorded-start averages', () => {
    const tasks = [
      task({ id: 'done', status: 'done', dayDate: '2026-10-26', completedAt: '2026-10-27T12:00:00Z' }),
      task({ id: 'doing', status: 'doing', dayDate: '2026-10-26' }),
      task({ id: 'recorded', status: 'done', dayDate: '2026-10-10', startedAt: '2026-10-24T12:00:00Z', completedAt: '2026-10-27T12:00:00Z' }),
    ]
    const original = structuredClone(tasks)
    const report = reportFixture(tasks)
    expect(report.rows.find((row) => row.id === 'done')).toMatchObject({ startedDays: 1, startDateSource: 'scheduled' })
    expect(report.rows.find((row) => row.id === 'doing')).toMatchObject({ inProgressDays: 1, startDateSource: 'scheduled' })
    expect(report.durations.started).toMatchObject({ values: [3], average: 3, available: 1, total: 2 })
    expect(report.coverage.missingStarted).toBe(1)
    expect(tasks).toEqual(original)
  })

  it('prefers a recorded current start over earlier scheduled work, even when dates conflict', () => {
    const tasks = [
      task({ id: 'old', status: 'doing', dayDate: '2026-10-10', carriedToId: 'live', startedAt: '2026-10-09T12:00:00Z' }),
      task({ id: 'live', status: 'doing', dayDate: '2026-10-26', originTaskId: 'old', startedAt: '2026-10-27T12:00:00Z' }),
    ]
    expect(reportFixture(tasks).rows[0]).toMatchObject({ inProgressDays: 0, startDateSource: 'recorded' })
    tasks[1] = { ...tasks[1], status: 'done', completedAt: '2026-10-26T12:00:00Z' }
    expect(reportFixture(tasks).rows[0]).toMatchObject({ startedDays: null, startDateSource: 'recorded' })
  })

  it('uses earlier recorded work before scheduled-day estimates and can recover an actual chain start', () => {
    const tasks = [
      task({ id: 'old', status: 'doing', dayDate: '2026-10-20', carriedToId: 'live' }),
      task({ id: 'live', status: 'doing', dayDate: '2026-10-26', originTaskId: 'old' }),
    ]
    expect(reportFixture(tasks).rows[0]).toMatchObject({ inProgressDays: 7, startDateSource: 'history' })
    tasks[0].startedAt = '2026-10-18T12:00:00Z'
    expect(reportFixture(tasks).rows[0]).toMatchObject({ inProgressDays: 9, startDateSource: 'recorded' })
  })

  it('never invents a start for untouched tasks, waiting containers or Bucket List ideas', () => {
    const report = reportFixture([
      task({ id: 'todo', dayDate: '2026-10-01' }),
      task({ id: 'waiting', status: 'done', rondeled: true, completedAt: '2026-10-27T12:00:00Z' }),
      task({ id: 'bucket', status: 'done', bucket: 'bucket-list', completedAt: '2026-10-27T12:00:00Z' }),
      task({ id: 'future', status: 'doing', dayDate: '2026-10-28' }),
    ])
    for (const row of report.rows) {
      expect(row.startedDays).toBeNull()
      expect(row.inProgressDays).toBeNull()
    }
  })
})
