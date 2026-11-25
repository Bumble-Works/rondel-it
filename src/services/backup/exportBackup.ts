import { exportSnapshot } from '../storage/localStore'
import { downloadTextFile } from '../../shared/downloadTextFile'

/** Only application records and merge metadata; never enumerate localStorage or sync configuration. */
export function serializeBackup(now = new Date()): string {
  return JSON.stringify({
    format: 'rondel-it-backup',
    version: 1,
    exportedAt: now.toISOString(),
    data: exportSnapshot(),
  }, null, 2)
}

export async function exportBackup(): Promise<boolean> {
  const now = new Date()
  const content = serializeBackup(now)
  const filename = `rondel-backup-${now.toISOString().replace(/[:.]/g, '-')}.json`
  return downloadTextFile(filename, content, 'application/json;charset=utf-8', { name: 'Rondel It backup', extensions: ['json'] })
}
