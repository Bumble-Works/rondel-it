import { getReportRange } from './reportRange'

describe('report range presets', () => {
  const today = '2026-10-25'

  it('defaults to fourteen inclusive calendar days and honors the week start setting', () => {
    expect(getReportRange('past-14-days', today, 1)).toEqual({ start: '2026-10-12', end: today })
    expect(getReportRange('this-week', today, 1)).toEqual({ start: '2026-10-19', end: today })
    expect(getReportRange('this-week', today, 0)).toEqual({ start: today, end: today })
    expect(getReportRange('last-week', today, 1)).toEqual({ start: '2026-10-12', end: '2026-10-18' })
  })

  it('ends current calendar periods today and includes full previous periods', () => {
    expect(getReportRange('this-month', today, 1)).toEqual({ start: '2026-10-01', end: today })
    expect(getReportRange('last-month', today, 1)).toEqual({ start: '2026-09-01', end: '2026-09-30' })
    expect(getReportRange('this-quarter', today, 1)).toEqual({ start: '2026-10-01', end: today })
    expect(getReportRange('last-quarter', today, 1)).toEqual({ start: '2026-07-01', end: '2026-09-30' })
    expect(getReportRange('this-year', today, 1)).toEqual({ start: '2026-01-01', end: today })
    expect(getReportRange('last-year', today, 1)).toEqual({ start: '2025-01-01', end: '2025-12-31' })
  })

  it('handles leap years and previous periods crossing the year boundary', () => {
    expect(getReportRange('last-month', '2024-03-31', 1)).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(getReportRange('last-quarter', '2026-01-31', 1)).toEqual({ start: '2025-10-01', end: '2025-12-31' })
    expect(getReportRange('last-week', '2026-01-02', 1)).toEqual({ start: '2025-12-22', end: '2025-12-28' })
  })

  it('allows a full ordinary or leap year and rejects an extra day', () => {
    for (const [start, end, tooLate] of [
      ['2025-01-01', '2025-12-31', '2026-01-01'],
      ['2024-01-01', '2024-12-31', '2025-01-01'],
      ['2026-10-27', '2027-10-26', '2027-10-27'],
      ['2024-02-29', '2025-02-28', '2025-03-01'],
    ]) {
      expect(getReportRange('custom', today, 1, { start, end })).toEqual({ start, end })
      expect(() => getReportRange('custom', today, 1, { start, end: tooLate })).toThrow('no more than one year')
    }
  })

  it('supports inclusive single-day and future custom ranges and rejects invalid dates', () => {
    const single = { start: '2026-12-25', end: '2026-12-25' }
    expect(getReportRange('custom', today, 1, single)).toEqual(single)
    expect(() => getReportRange('custom', today, 1)).toThrow('Choose a start and end')
    expect(() => getReportRange('custom', today, 1, { start: '2026-02-30', end: today })).toThrow('valid report dates')
    expect(() => getReportRange('custom', today, 1, { start: today, end: '2026-10-01' })).toThrow('start on or before')
  })
})
