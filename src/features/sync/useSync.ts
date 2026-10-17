import { useCallback, useEffect, useRef, useState } from 'react'
import { isDesktopApp, tauriFolder } from '../../services/sync/folder'
import { startVisibleInterval } from '../../shared/visibleInterval'
import { getLastSyncedAt, getSyncFolder, startSyncingTo, syncNow, turnOffSync } from '../../services/sync/syncService'

const AFTER_CHANGE_MS = 2000
const WHILE_OPEN_MS = 2 * 60 * 1000

export interface SyncState {
  available: boolean
  folder: string | null
  lastSyncedAt: string | null
  syncing: boolean
  warning: string | null
}

interface Options {
  /** Another device changed something: reload everything from storage. */
  onRemoteChange: () => void
  reportError: (context: string, e: unknown) => void
}

/**
 * Runs folder sync in the Mac app: on open, when the window regains focus,
 * shortly after local changes, and every couple of minutes while open.
 */
export function useSync({ onRemoteChange, reportError }: Options) {
  const available = isDesktopApp()
  const [folder, setFolder] = useState(getSyncFolder)
  const [lastSyncedAt, setLastSyncedAt] = useState(getLastSyncedAt)
  const [syncing, setSyncing] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const sync = useCallback(async () => {
    if (!available || !getSyncFolder()) return
    setSyncing(true)
    try {
      const result = await syncNow(tauriFolder)
      setLastSyncedAt(getLastSyncedAt())
      setWarning(
        result.rebuilt
          ? 'The sync folder was missing, so it was rebuilt from this Mac’s data.'
          : result.unreadable.length
            ? `Ignored ${result.unreadable.length} unreadable sync file(s); nothing was changed from them.`
            : null,
      )
      if (result.changed) onRemoteChange()
    } catch (e) {
      reportError('Sync failed', e)
    } finally {
      setSyncing(false)
    }
  }, [available, onRemoteChange, reportError])

  /** Call after any local change; syncs once things settle. */
  const scheduleSync = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void sync(), AFTER_CHANGE_MS)
  }, [sync])

  // The schedule reads the latest `sync` through a ref, so it isn't reset (and
  // doesn't write to the folder) every time the board's view changes.
  const latestSync = useRef(sync)
  useEffect(() => {
    latestSync.current = sync
  }, [sync])

  useEffect(() => {
    if (!available) return
    const run = () => void latestSync.current()
    const first = window.setTimeout(run, 0)
    // Also syncs right away when the window is shown again.
    const stopInterval = startVisibleInterval(run, WHILE_OPEN_MS)
    const onFocus = run
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearTimeout(first)
      stopInterval()
      window.removeEventListener('focus', onFocus)
    }
  }, [available])

  const chooseFolder = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const picked = await open({ directory: true, title: 'Choose where to sync Rondel It' })
      if (typeof picked !== 'string') return
      setFolder(await startSyncingTo(tauriFolder, picked))
      await sync()
    } catch (e) {
      reportError('Couldn’t set up the sync folder', e)
    }
  }, [reportError, sync])

  const showInFinder = useCallback(async () => {
    const dir = getSyncFolder()
    if (!dir) return
    try {
      const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
      await revealItemInDir(`${dir}/README.txt`)
    } catch (e) {
      reportError('Couldn’t open the sync folder', e)
    }
  }, [reportError])

  const turnOff = useCallback(() => {
    turnOffSync()
    setFolder(null)
    setLastSyncedAt(null)
    setWarning(null)
  }, [])

  const state: SyncState = { available, folder, lastSyncedAt, syncing, warning }
  return { state, sync, scheduleSync, chooseFolder, showInFinder, turnOff }
}
