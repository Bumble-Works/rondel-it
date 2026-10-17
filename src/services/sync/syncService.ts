import { mergeSnapshots, type Snapshot } from '../../domain/sync'
import { exportSnapshot, importSnapshot } from '../storage/localStore'
import type { FolderAccess } from './folder'

/**
 * Folder sync. Each device keeps its full data locally and writes its own
 * snapshot file into `<sync folder>/devices/`; it reads the others and merges.
 * The folder is only a mailbox: deleting it never deletes anyone's tasks.
 */
export const SYNC_DIR_NAME = 'Rondel It'
const FORMAT = 1

// Device-specific, never synced.
const FOLDER_KEY = 'rondel.sync.folder'
const DEVICE_KEY = 'rondel.sync.deviceId'
const LAST_SYNCED_KEY = 'rondel.sync.lastSyncedAt'

const README = `Rondel It sync data

This folder keeps your Rondel It devices in sync. Please don't edit, move or
rename anything in here.

Each device has its own full copy of your tasks, so deleting this folder won't
delete them: Rondel It will notice and rebuild it.
`

interface DeviceFile {
  format: number
  deviceId: string
  writtenAt: string
  data: Snapshot
}

export interface SyncResult {
  /** Local data changed because of another device. */
  changed: boolean
  /** The folder had gone missing and was rebuilt from this device's data. */
  rebuilt: boolean
  /** Device files that couldn't be read and were ignored (never applied). */
  unreadable: string[]
}

export function getSyncFolder(): string | null {
  return localStorage.getItem(FOLDER_KEY)
}

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNCED_KEY)
}

export function turnOffSync() {
  localStorage.removeItem(FOLDER_KEY)
  localStorage.removeItem(LAST_SYNCED_KEY)
}

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

/** The folder the user picked, or a "Rondel It" folder inside it. */
export function syncDirFor(picked: string): string {
  const trimmed = picked.replace(/\/+$/, '')
  return trimmed.split('/').pop() === SYNC_DIR_NAME ? trimmed : `${trimmed}/${SYNC_DIR_NAME}`
}

async function prepare(fs: FolderAccess, dir: string) {
  await fs.ensureDir(`${dir}/devices`)
  if (!(await fs.exists(`${dir}/README.txt`))) await fs.write(`${dir}/README.txt`, README)
}

/** Starts syncing to `<picked>/Rondel It` (or `picked` itself if it's already that folder). */
export async function startSyncingTo(fs: FolderAccess, picked: string): Promise<string> {
  const dir = syncDirFor(picked)
  await prepare(fs, dir)
  localStorage.setItem(FOLDER_KEY, dir)
  return dir
}

function parseDeviceFile(text: string): DeviceFile | null {
  try {
    const file = JSON.parse(text) as DeviceFile
    const d = file?.data
    const valid = file.format === FORMAT && d && Array.isArray(d.tasks) && Array.isArray(d.tags) && Array.isArray(d.rules) && d.meta
    return valid ? file : null
  } catch {
    return null
  }
}

let running: Promise<SyncResult> | null = null

/** One sync pass. Overlapping calls share the pass already running. */
export function syncNow(fs: FolderAccess): Promise<SyncResult> {
  running ??= runSync(fs).finally(() => {
    running = null
  })
  return running
}

async function runSync(fs: FolderAccess): Promise<SyncResult> {
  const dir = getSyncFolder()
  if (!dir) return { changed: false, rebuilt: false, unreadable: [] }

  const rebuilt = !(await fs.exists(dir))
  await prepare(fs, dir)

  const me = deviceId()
  const others = (await fs.listFiles(`${dir}/devices`)).filter((name) => name.endsWith('.json') && name !== `${me}.json`)
  const remotes: Snapshot[] = []
  const unreadable: string[] = []
  for (const name of others) {
    // A file still downloading (or hand-edited) is skipped, never applied.
    const file = await fs.read(`${dir}/devices/${name}`).then(parseDeviceFile, () => null)
    if (file) remotes.push(file.data)
    else unreadable.push(name)
  }
  if (unreadable.length) console.error('[rondel] Ignored unreadable sync files:', unreadable)

  // No awaits between reading local data and saving the merge, so edits made
  // meanwhile can't be lost.
  const local = exportSnapshot()
  const merged = mergeSnapshots([local, ...remotes])
  const changed = JSON.stringify(merged) !== JSON.stringify(mergeSnapshots([local]))
  if (changed) importSnapshot(merged)

  const file: DeviceFile = { format: FORMAT, deviceId: me, writtenAt: new Date().toISOString(), data: merged }
  await fs.write(`${dir}/devices/${me}.json`, JSON.stringify(file))
  localStorage.setItem(LAST_SYNCED_KEY, file.writtenAt)
  return { changed, rebuilt, unreadable }
}
