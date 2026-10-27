import { getReportRange } from './reportRange'

describe('report range presets', () => {
  const today = '2026-10-25'

  it('uses full Sunday-to-Saturday weeks for this, last and next week', () => {
    expect(getReportRange('this-week', '2026-10-27')).toEqual({ start: '2026-10-25', end: '2026-10-31' })
    expect(getReportRange('last-week', '2026-10-27')).toEqual({ start: '2026-10-18', end: '2026-10-24' })
    expect(getReportRange('next-week', '2026-10-27')).toEqual({ start: '2026-11-01', end: '2026-11-07' })
    expect(getReportRange('this-week', '2026-10-31')).toEqual({ start: '2026-10-25', end: '2026-10-31' })
  })

  it('includes the full month, including future dates and leap days', () => {
    expect(getReportRange('this-month', today)).toEqual({ start: '2026-10-01', end: '2026-10-31' })
    expect(getReportRange('last-month', today)).toEqual({ start: '2026-09-01', end: '2026-09-30' })
    expect(getReportRange('this-month', '2024-02-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' })
  })

  it('handles previous months and weeks crossing year boundaries', () => {
    expect(getReportRange('last-month', '2026-01-01')).toEqual({ start: '2025-12-01', end: '2025-12-31' })
    expect(getReportRange('this-week', '2026-01-02')).toEqual({ start: '2025-12-28', end: '2026-01-03' })
    expect(getReportRange('next-week', '2026-12-29')).toEqual({ start: '2027-01-03', end: '2027-01-09' })
  })

  it('allows a full ordinary or leap year and rejects an extra day', () => {
    for (const [start, end, tooLate] of [
      ['2025-01-01', '2025-12-31', '2026-01-01'],
      ['2024-01-01', '2024-12-31', '2025-01-01'],
      ['2026-10-27', '2027-10-26', '2027-10-27'],
      ['2024-02-29', '2025-02-28', '2025-03-01'],
    ]) {
      expect(getReportRange('custom', today, { start, end })).toEqual({ start, end })
      expect(() => getReportRange('custom', today, { start, end: tooLate })).toThrow('no more than one year')
    }
  })

  it('supports inclusive single-day and future custom ranges and rejects invalid dates', () => {
    const single = { start: '2026-12-25', end: '2026-12-25' }
    expect(getReportRange('custom', today, single)).toEqual(single)
    expect(() => getReportRange('custom', today)).toThrow('Choose a start and end')
    expect(() => getReportRange('custom', today, { start: '2026-02-30', end: today })).toThrow('valid report dates')
    expect(() => getReportRange('custom', today, { start: today, end: '2026-10-01' })).toThrow('start on or before')
  })
})
