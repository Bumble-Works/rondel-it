import { mergeSnapshots, type Snapshot } from '../../domain/sync'
import { exportSnapshot, importSnapshot } from '../storage/localStore'
import type { FolderAccess } from './folder'
import { validateSnapshot } from './validate'

/**
 * Folder sync. Each device keeps its full data locally and writes its own
 * snapshot file into `<sync folder>/devices/`; it reads the others and merges.
 * The folder is only a mailbox: deleting it never deletes anyone's tasks.
 */
export const SYNC_DIR_NAME = 'Rondel It'
const FORMAT = 1

// Device-specific, never synced.
const FOLDER_KEY = 'rondel.sync.folder'
/** The folder the user picked (e.g. "My Drive"); the app only has access inside it. */
const ROOT_KEY = 'rondel.sync.root'
const DEVICE_KEY = 'rondel.sync.deviceId'
const LAST_SYNCED_KEY = 'rondel.sync.lastSyncedAt'
const LAST_WRITE_ID_KEY = 'rondel.sync.lastWriteId'
const LAST_FINGERPRINT_KEY = 'rondel.sync.lastFingerprint'

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
  /** Unique per write: tells this device whether it wrote "its" file itself. */
  writeId: string
  data: Snapshot
}

export interface SyncResult {
  /** Local data changed because of another device. */
  changed: boolean
  /** The folder had gone missing and was rebuilt from this device's data. */
  rebuilt: boolean
  /** Device files that couldn't be read and were ignored (never applied). */
  unreadable: string[]
  /** Malformed records in other devices' files that were skipped. */
  droppedRecords: number
}

export function getSyncFolder(): string | null {
  return localStorage.getItem(FOLDER_KEY)
}

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNCED_KEY)
}

export function turnOffSync() {
  localStorage.removeItem(FOLDER_KEY)
  localStorage.removeItem(ROOT_KEY)
  localStorage.removeItem(LAST_SYNCED_KEY)
  localStorage.removeItem(LAST_FINGERPRINT_KEY)
}

function newDeviceId(): string {
  const id = crypto.randomUUID()
  localStorage.setItem(DEVICE_KEY, id)
  localStorage.removeItem(LAST_FINGERPRINT_KEY)
  return id
}

function deviceId(): string {
  return localStorage.getItem(DEVICE_KEY) ?? newDeviceId()
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
  localStorage.setItem(ROOT_KEY, picked.replace(/\/+$/, ''))
  return dir
}

function parseDeviceFile(text: string): { file: DeviceFile; droppedRecords: number } | null {
  try {
    const file = JSON.parse(text) as DeviceFile
    if (file?.format !== FORMAT || typeof file.deviceId !== 'string') return null
    const result = validateSnapshot(file.data)
    if (!result.ok) {
      console.error(`[rondel] Ignored sync file from device ${file.deviceId}: ${result.reason}`)
      return null
    }
    return { file: { ...file, data: result.snapshot }, droppedRecords: result.droppedRecords }
  } catch {
    return null
  }
}

/** Short fingerprint of what this device last wrote, to skip identical rewrites. */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return `${text.length}:${(hash >>> 0).toString(16)}`
}

export class SyncFolderUnavailable extends Error {}

let running: Promise<SyncResult> | null = null
let queued: Promise<SyncResult> | null = null

/**
 * One sync pass. A call while a pass is running gets one follow-up pass after
 * it, so an edit made mid-pass is synced right after instead of minutes later.
 */
export function syncNow(fs: FolderAccess): Promise<SyncResult> {
  if (!running) {
    running = runSync(fs).finally(() => {
      running = null
    })
    return running
  }
  queued ??= running
    .catch(() => undefined)
    .then(() => {
      queued = null
      return syncNow(fs)
    })
  return queued
}

async function runSync(fs: FolderAccess): Promise<SyncResult> {
  const dir = getSyncFolder()
  if (!dir) return { changed: false, rebuilt: false, unreadable: [], droppedRecords: 0 }

  // The folder the user picked (e.g. "My Drive") must still exist. If it's gone,
  // the cloud drive isn't running or signed in: don't create a local stand-in
  // that nothing else would ever see.
  const root = localStorage.getItem(ROOT_KEY) ?? dir.slice(0, dir.lastIndexOf('/'))
  if (!(await fs.exists(root))) {
    throw new SyncFolderUnavailable(
      `The sync folder isn't available (${root}). Is your cloud drive app running and signed in?`,
    )
  }
  const rebuilt = !(await fs.exists(dir))
  await prepare(fs, dir)

  let me = deviceId()
  const remotes: Snapshot[] = []
  const unreadable: string[] = []
  let droppedRecords = 0
  const readDevice = async (name: string) => {
    // A file still downloading (or hand-edited) is skipped, never applied.
    const parsed = await fs.read(`${dir}/devices/${name}`).then(parseDeviceFile, () => null)
    if (parsed) {
      remotes.push(parsed.file.data)
      droppedRecords += parsed.droppedRecords
    } else unreadable.push(name)
    return parsed?.file ?? null
  }

  // If "my" file wasn't written by me (this Mac's data was copied to another,
  // e.g. by Migration Assistant), take a new id and treat that file as another device.
  const mine = `${me}.json`
  if (await fs.exists(`${dir}/devices/${mine}`)) {
    const text = await fs.read(`${dir}/devices/${mine}`).catch(() => null)
    let writeId: string | undefined
    try {
      writeId = text ? (JSON.parse(text) as Partial<DeviceFile>).writeId : undefined
    } catch {
      writeId = undefined // unreadable: it's ours to overwrite
    }
    if (writeId && writeId !== localStorage.getItem(LAST_WRITE_ID_KEY)) {
      await readDevice(mine)
      me = newDeviceId()
    }
  }

  const others = (await fs.listFiles(`${dir}/devices`)).filter(
    (name) => name.endsWith('.json') && name !== `${me}.json` && name !== mine,
  )
  for (const name of others) await readDevice(name)
  if (unreadable.length) console.error('[rondel] Ignored unreadable sync files:', unreadable)
  if (droppedRecords) console.error(`[rondel] Ignored ${droppedRecords} malformed record(s) from other devices`)

  // No awaits between reading local data and saving the merge, so edits made
  // meanwhile can't be lost.
  const local = exportSnapshot()
  const merged = mergeSnapshots([local, ...remotes])
  const changed = JSON.stringify(merged) !== JSON.stringify(mergeSnapshots([local]))
  if (changed) importSnapshot(merged)

  // Sync was turned off or moved mid-pass: don't write to the old folder.
  if (getSyncFolder() !== dir) return { changed, rebuilt, unreadable, droppedRecords }

  const data = JSON.stringify(merged)
  const myPath = `${dir}/devices/${me}.json`
  const unchanged = fingerprint(data) === localStorage.getItem(LAST_FINGERPRINT_KEY) && (await fs.exists(myPath))
  if (!unchanged) {
    const file: DeviceFile = {
      format: FORMAT,
      deviceId: me,
      writtenAt: new Date().toISOString(),
      writeId: crypto.randomUUID(),
      data: merged,
    }
    await fs.write(myPath, JSON.stringify(file))
    localStorage.setItem(LAST_WRITE_ID_KEY, file.writeId)
    localStorage.setItem(LAST_FINGERPRINT_KEY, fingerprint(data))
  }
  localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString())
  return { changed, rebuilt, unreadable, droppedRecords }
}
