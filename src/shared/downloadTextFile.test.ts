import { downloadTextFile } from './downloadTextFile'

vi.mock('../services/sync/folder', () => ({ isDesktopApp: () => false }))

it('propagates browser download failures and releases the temporary link and URL', async () => {
  vi.useFakeTimers()
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:backup', revokeObjectURL })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Download blocked') })
  try {
    await expect(downloadTextFile('backup.json', '{}', 'application/json', { name: 'Backup', extensions: ['json'] })).rejects.toThrow('Download blocked')
    expect(document.querySelector('a[download]')).toBeNull()
    await vi.runAllTimersAsync()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup')
  } finally { vi.unstubAllGlobals() }
})
