import { reportFixture, reportFixtureTags as tags, reportFixtureTask as task } from '../../test/reportFixtures'
import { downloadReportCsv } from './downloadReportCsv'

const mocks = vi.hoisted(() => ({ desktop: false, save: vi.fn(), write: vi.fn() }))
vi.mock('../../services/sync/folder', () => ({ isDesktopApp: () => mocks.desktop }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: mocks.save }))
vi.mock('@tauri-apps/plugin-fs', () => ({ writeTextFile: mocks.write }))
const tasks = [task()]
const dashboard = reportFixture(tasks)
const context = { range: dashboard.range }

beforeEach(() => { mocks.desktop = false; mocks.save.mockReset(); mocks.write.mockReset() })

it('downloads a UTF-8 CSV with report dates in its filename and releases the URL', async () => {
  vi.useFakeTimers()
  const create = vi.fn<(blob: Blob) => string>(() => 'blob:report')
  const revoke = vi.fn()
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('rondel-report-2026-10-01-2026-10-31.csv')
    expect(this.href).toBe('blob:report')
  })
  try {
    await downloadReportCsv(dashboard.rows, tags, context)
    expect(click).toHaveBeenCalledOnce()
    expect(create.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
    expect(document.querySelector('a[download]')).toBeNull()
    await vi.runAllTimersAsync()
    expect(revoke).toHaveBeenCalledWith('blob:report')
  } finally { vi.unstubAllGlobals() }
})

it('saves through the native picker and treats cancellation as a normal result', async () => {
  mocks.desktop = true
  mocks.save.mockResolvedValueOnce('/chosen/report.csv').mockResolvedValueOnce(null)
  mocks.write.mockResolvedValue(undefined)
  await downloadReportCsv(dashboard.rows, tags, context)
  expect(mocks.save).toHaveBeenCalledWith({ defaultPath: 'rondel-report-2026-10-01-2026-10-31.csv',
    filters: [{ name: 'CSV spreadsheet', extensions: ['csv'] }] })
  expect(mocks.write).toHaveBeenCalledWith('/chosen/report.csv', expect.stringContaining('Days in progress'))
  await downloadReportCsv(dashboard.rows, tags, context)
  expect(mocks.write).toHaveBeenCalledTimes(1)
})

it('propagates native save failures so the caller can show the error', async () => {
  mocks.desktop = true
  mocks.save.mockResolvedValue('/chosen/report.csv')
  mocks.write.mockRejectedValue(new Error('Disk full'))
  await expect(downloadReportCsv(dashboard.rows, tags, context)).rejects.toThrow('Disk full')
})
