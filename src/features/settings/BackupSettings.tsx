import { useRef, useState } from 'react'
import { exportBackup } from '../../services/backup/exportBackup'
import { Button } from '../../shared/ui/Button'
import './BackupSettings.css'

export function BackupSettings() {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [requested, setRequested] = useState(false)
  const download = async () => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    setRequested(false)
    try {
      setRequested(await exportBackup())
    } catch (cause) {
      console.error('[rondel] Backup export failed', cause)
      setError('Could not export the backup. Check available storage and download permissions, then try again.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return <section className="settings-card backup-settings">
    <h2>Backup</h2>
    <p className="settings-hint">Download all tasks, notes, tags, recurring rules and settings from this app, including history and deletion records.</p>
    <p className="settings-hint">Backups contain private data and are not encrypted. Keep them somewhere safe. Device identity, sync-folder location and credentials are not included.</p>
    <p className="settings-hint">Restoring a backup is not available yet. Export does not change your data or sync it to another device.</p>
    <Button disabled={busy} onClick={() => void download()}>{busy ? 'Exporting…' : 'Export backup'}</Button>
    {error && <p role="alert">{error}</p>}
    {requested && <p role="status">Backup download requested. Check that the file was saved.</p>}
  </section>
}
