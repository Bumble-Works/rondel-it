import { reportFixtureTask } from '../../test/reportFixtures'
import { exportSnapshot, importSnapshot, writeCollection, writeSettings } from '../storage/localStore'
import { serializeBackup, exportBackup } from './exportBackup'
import { downloadTextFile } from '../../shared/downloadTextFile'

vi.mock('../../shared/downloadTextFile', () => ({ downloadTextFile: vi.fn() }))

it('round-trips every stored collection and merge/deletion metadata without device state or writes', () => {
  writeCollection('tasks', [reportFixtureTask({ note: 'Private context', reminderTime: '09:00', rondelCount: 2,
    rondelHistory: [{ id: 'move', occurredAt: '2026-10-20T12:00:00Z', fromDate: '2026-10-20', toDate: '2026-10-27', fromRondeled: false, toRondeled: false, fromBucket: null, toBucket: null, status: 'todo' }] })])
  writeCollection('tags', [{ id: 'keep', name: 'Work', color: '#123456' }, { id: 'gone', name: 'Deleted', color: '#000000' }])
  writeCollection('tags', [{ id: 'keep', name: 'Work', color: '#123456' }])
  writeCollection('rules', [{ id: 'rule', title: 'Daily', kind: 'repeat', repeat: { unit: 'day', every: 1, startDate: '2026-10-01', endDate: null }, tagIds: ['keep'], note: 'Context', flagged: true, reminderTime: '10:00' }])
  writeSettings({ weekStartDay: 1, dayStartTime: '08:00', endOfDayTime: '18:00', timezone: 'Asia/Jerusalem' })
  localStorage.setItem('rondel.sync', JSON.stringify({ deviceId: 'secret-device', folder: '/private/folder', token: 'secret-token' }))
  localStorage.setItem('provider-api-key', 'secret-key')
  const snapshot = exportSnapshot()
  const before = { ...localStorage }
  const text = serializeBackup(new Date('2026-11-19T00:00:00Z'))
  const backup = JSON.parse(text)
  expect(backup).toEqual({ format: 'rondel-it-backup', version: 1, exportedAt: '2026-11-19T00:00:00.000Z', data: snapshot })
  expect(backup.data.meta.deleted.tags.gone).toBeTruthy()
  expect(text).not.toMatch(/secret-device|private\/folder|secret-token|secret-key/)
  expect({ ...localStorage }).toEqual(before)
  localStorage.clear()
  importSnapshot(backup.data) // Test fixture round-trip, not a user-facing restore API.
  expect(exportSnapshot()).toEqual(snapshot)
})

it('exports an empty installation and rejects unreadable data instead of downloading partial data', async () => {
  expect(JSON.parse(serializeBackup()).data.tasks).toEqual([])
  localStorage.setItem('rondel.v6.tasks', 'broken JSON')
  await expect(exportBackup()).rejects.toThrow('unreadable')
  expect(downloadTextFile).not.toHaveBeenCalled()
  expect(localStorage.getItem('rondel.v6.tasks')).toBe('broken JSON')
})

it('passes a versioned JSON download through and preserves cancellation/failure results', async () => {
  vi.mocked(downloadTextFile).mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('Disk full'))
  expect(await exportBackup()).toBe(false)
  expect(downloadTextFile).toHaveBeenCalledWith(expect.stringMatching(/^rondel-backup-.*\.json$/), expect.stringContaining('"version": 1'), 'application/json;charset=utf-8', { name: 'Rondel It backup', extensions: ['json'] })
  await expect(exportBackup()).rejects.toThrow('Disk full')
})
