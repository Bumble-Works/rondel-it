import type { useSync } from '../sync/useSync'
import { Button } from '../../shared/ui/Button'
import './SyncSettings.css'

interface SyncSettingsProps {
  sync: ReturnType<typeof useSync>
}

/** Shortens /Users/<name>/Library/CloudStorage/GoogleDrive-…/My Drive/Rondel It for display. */
function friendlyPath(path: string): string {
  const cloud = /\/Library\/CloudStorage\/([^/]+)\/(.*)$/.exec(path)
  if (cloud) {
    const provider = cloud[1].replace(/-.*/, '').replace('GoogleDrive', 'Google Drive')
    return `${provider} › ${cloud[2].split('/').join(' › ')}`
  }
  return path.replace(/^\/Users\/[^/]+/, '~')
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function SyncSettings({ sync }: SyncSettingsProps) {
  const { available, folder, lastSyncedAt, syncing, warning } = sync.state

  return (
    <section className="settings-card">
      <h2>Sync</h2>
      <p className="settings-hint">
        Keep your Macs (and later your iPhone) in sync through a folder in Google Drive, OneDrive, Box or
        Dropbox. Install that service’s desktop app, then choose a folder inside it. Rondel It creates a
        “Rondel It” folder there. Every device keeps its own full copy, so nothing is lost if the folder is.
      </p>

      {!available ? (
        <p className="sync-status">Sync works in the Mac app. You’re using the browser version.</p>
      ) : !folder ? (
        <div className="sync-actions">
          <span className="sync-status">Sync is off.</span>
          <Button variant="primary" onClick={() => void sync.chooseFolder()}>
            Choose folder…
          </Button>
        </div>
      ) : (
        <>
          <div className="sync-folder" title={folder}>
            {friendlyPath(folder)}
          </div>
          <p className="sync-status">
            {syncing ? 'Syncing…' : lastSyncedAt ? `Last synced ${formatTime(lastSyncedAt)}` : 'Not synced yet'}
          </p>
          {warning && <p className="sync-warning">{warning}</p>}
          <div className="sync-actions">
            <Button variant="secondary" size="sm" disabled={syncing} onClick={() => void sync.sync()}>
              Sync now
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void sync.showInFinder()}>
              Show in Finder
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void sync.chooseFolder()}>
              Change folder…
            </Button>
            <Button variant="ghost" size="sm" onClick={sync.turnOff}>
              Turn off
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
