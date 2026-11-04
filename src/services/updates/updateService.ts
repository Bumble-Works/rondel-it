import { isDesktopApp } from '../sync/folder'

export type UpdateErrorCode = 'offline' | 'bad-signature' | 'install-failed' | 'unknown'

interface DownloadProgressStarted {
  event: 'Started'
  data: { contentLength?: number }
}

interface DownloadProgressChunk {
  event: 'Progress'
  data: { chunkLength: number }
}

interface DownloadProgressFinished {
  event: 'Finished'
}

type DownloadProgressEvent = DownloadProgressStarted | DownloadProgressChunk | DownloadProgressFinished

interface UpdateHandle {
  downloadAndInstall(onEvent?: (event: DownloadProgressEvent) => void): Promise<void>
}

export interface AvailableUpdate {
  version: string
  currentVersion: string
  notes: string
  date: string | null
  handle: unknown
}

/** Checks for a desktop app update and returns it, or null when up to date/browser. */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!isDesktopApp()) return null

  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) return null

    return {
      version: update.version,
      currentVersion: update.currentVersion,
      notes: update.body ?? '',
      date: update.date ?? null,
      handle: update,
    }
  } catch (error) {
    console.error('[updates] Failed to check for updates', error)
    throw mapUpdateError(error)
  }
}

/** Downloads and installs a discovered update with optional progress reporting. */
export async function installUpdate(
  update: AvailableUpdate,
  onProgress: (fraction: number | null) => void,
): Promise<void> {
  if (!isDesktopApp()) return

  const handle = asUpdateHandle(update.handle)
  if (!handle) {
    console.error('[updates] Update handle is missing downloadAndInstall')
    throw 'unknown' as UpdateErrorCode
  }

  let totalBytes: number | null = null
  let downloadedBytes = 0

  try {
    await handle.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        totalBytes = event.data.contentLength ?? null
        downloadedBytes = 0
        onProgress(totalBytes === null ? null : 0)
        return
      }

      if (event.event === 'Progress') {
        downloadedBytes += event.data.chunkLength
        if (totalBytes === null || totalBytes <= 0) {
          onProgress(null)
        } else {
          onProgress(Math.min(downloadedBytes / totalBytes, 1))
        }
        return
      }

      onProgress(1)
    })
  } catch (error) {
    console.error('[updates] Failed to download/install update', error)
    throw mapUpdateError(error)
  }
}

/** Relaunches the desktop app after install on platforms that require it. */
export async function relaunchApp(): Promise<void> {
  if (!isDesktopApp()) return

  try {
    const { relaunch } = await import('@tauri-apps/plugin-process')
    await relaunch()
  } catch (error) {
    console.error('[updates] Failed to relaunch app', error)
    throw mapUpdateError(error)
  }
}

/** Returns the running desktop app version; browser callers get an empty value. */
export async function getRunningVersion(): Promise<string> {
  if (!isDesktopApp()) return ''

  try {
    const { getVersion } = await import('@tauri-apps/api/app')
    return await getVersion()
  } catch (error) {
    console.error('[updates] Failed to read running app version', error)
    throw mapUpdateError(error)
  }
}

function asUpdateHandle(handle: unknown): UpdateHandle | null {
  if (!handle || typeof handle !== 'object') return null
  if (!('downloadAndInstall' in handle)) return null
  if (typeof handle.downloadAndInstall !== 'function') return null
  return handle as UpdateHandle
}

function mapUpdateError(error: unknown): UpdateErrorCode {
  const message = String(error instanceof Error ? error.message : error).toLowerCase()

  if (
    message.includes('offline') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timed out') ||
    message.includes('dns') ||
    message.includes('fetch')
  ) {
    return 'offline'
  }

  if (message.includes('signature') || message.includes('verify') || message.includes('integrity')) {
    return 'bad-signature'
  }

  if (
    message.includes('install') ||
    message.includes('extract') ||
    message.includes('restart') ||
    message.includes('relaunch') ||
    message.includes('permission')
  ) {
    return 'install-failed'
  }

  return 'unknown'
}
