import { reportFixture, reportFixtureTask as task } from '../../test/reportFixtures'
import { progressDays, sortReportRows } from './reportPresentation'

describe('report table sorting', () => {
  it('sorts completed and unfinished progress together, preserves zero, and keeps unknowns last', () => {
    const rows = reportFixture([
      task({ id: 'unknown', title: 'Unknown' }),
      task({ id: 'open', title: 'Open', status: 'doing', startedAt: '2026-10-01T12:00:00Z' }),
      task({ id: 'done', title: 'Done', status: 'done', startedAt: '2026-10-18T12:00:00Z', completedAt: '2026-10-20T12:00:00Z' }),
      task({ id: 'zero', title: 'Zero', status: 'done', startedAt: '2026-10-20T09:00:00Z', completedAt: '2026-10-20T12:00:00Z' }),
    ]).rows
    const original = rows.map((row) => row.id)
    expect(sortReportRows(rows, 'in-progress', 'ascending').map((row) => row.id)).toEqual(['zero', 'done', 'open', 'unknown'])
    expect(sortReportRows(rows, 'in-progress', 'descending').map((row) => row.id)).toEqual(['open', 'done', 'zero', 'unknown'])
    expect(rows.map((row) => row.id)).toEqual(original)
    expect(progressDays(rows.find((row) => row.id === 'done')!)).toBe(2)
  })

  it('sorts lifetime moves and breaks equal-title ties by lineage', () => {
    const rows = reportFixture([
      task({ id: 'z', title: 'Same', rondelCount: 1 }),
      task({ id: 'a', title: 'Same', rondelCount: 1 }),
      task({ id: 'many', rondelCount: 14 }),
    ]).rows
    expect(sortReportRows(rows, 'rondels').map((row) => row.id)).toEqual(['many', 'a', 'z'])
    expect(sortReportRows(rows, 'rondels', 'ascending').map((row) => row.id)).toEqual(['a', 'z', 'many'])
  })

  it('sorts the first-seen and completion dates without substituting the latest scheduled date', () => {
    const rows = reportFixture([
      task({ id: 'old', dayDate: '2026-11-02', originDate: '2026-10-01', createdAt: '2026-10-01T12:00:00Z' }),
      task({ id: 'new', status: 'done', dayDate: '2026-10-20', originDate: '2026-10-15', createdAt: '2026-10-15T12:00:00Z', completedAt: '2026-10-20T12:00:00Z' }),
      task({ id: 'unknown', status: 'done', dayDate: null, originDate: null, createdAt: '', bucket: 'bucket-list', completedAt: '2026-10-21T12:00:00Z' }),
    ]).rows
    expect(sortReportRows(rows, 'first-seen', 'ascending').map((row) => row.id)).toEqual(['old', 'new', 'unknown'])
    expect(sortReportRows(rows, 'completed').map((row) => row.id)).toEqual(['unknown', 'new', 'old'])
  })
})
